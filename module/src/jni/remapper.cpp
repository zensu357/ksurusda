#include "remapper.h"

#include <link.h>
#include <sys/mman.h>
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <string>
#include <vector>

#include "log.h"

// Struct to hold a single entry in /proc/maps/
// Format: 7ac49c2000(start)-7ac4a26000(end) r--p (permissions) 00000000(offset) 00:00 0 (dev) 1245 (inode) /apex/com.android.runtime/bin/linker64 (path) // NOLINT
struct PROCMAPSINFO {
    uintptr_t start{0};
    uintptr_t end{0};
    uintptr_t offset{0};
    uint8_t perms{0};
    ino_t inode{0};
    std::string dev;
    std::string path;
};


std::vector<PROCMAPSINFO> get_modules_by_name(std::string const &mName) {
    std::string process_maps_locations = "/proc/self/maps";

    std::vector<PROCMAPSINFO> maps;

    char buffer[1024];
    FILE *fp = fopen(process_maps_locations.c_str(), "re");

    if (fp == nullptr) {
        return maps;
    }

    while (fgets(buffer, sizeof(buffer), fp)) {
        if (strstr(buffer, mName.c_str())) {
            PROCMAPSINFO info{};
            char perms[16] = {0};
            char path[512] = {0};
            char dev[32] = {0};

            int matched = sscanf(
                buffer,
                "%" SCNxPTR "-%" SCNxPTR " %15s %" SCNxPTR " %31s %ld %511s",
                &info.start, &info.end, perms, &info.offset, dev, &info.inode, path);

            if (matched >= 6) {
                info.perms = 0;
                /* Store process permissions in the struct directly via bitwise operations */
                if (strchr(perms, 'r')) info.perms |= PROT_READ;
                if (strchr(perms, 'w')) info.perms |= PROT_WRITE;
                if (strchr(perms, 'x')) info.perms |= PROT_EXEC;

                info.dev = dev;
                info.path = (matched >= 7) ? path : "";

                maps.push_back(info);
            }
        }
    }

    fclose(fp);

    return maps;
}

void remap_lib(std::string lib_path) {
    std::string lib_name = lib_path.substr(lib_path.find_last_of("/\\") + 1);

    std::vector<PROCMAPSINFO> maps = get_modules_by_name(lib_name);
    if (maps.empty()) {
        return;
    }

    LOGI("Remapping %s (%zu segments)", lib_name.c_str(), maps.size());

    long page_size_conf = sysconf(_SC_PAGESIZE);
    size_t page_size = (page_size_conf > 0) ? static_cast<size_t>(page_size_conf) : 4096;

    for (const auto &info : maps) {
        if (info.end <= info.start) continue;

        uintptr_t aligned_start = info.start & ~(page_size - 1);
        uintptr_t aligned_end = (info.end + page_size - 1) & ~(page_size - 1);
        size_t aligned_size = aligned_end - aligned_start;

        void *address = reinterpret_cast<void *>(aligned_start);

        void *map = mmap(nullptr, aligned_size, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
        if (map == MAP_FAILED) {
            LOGE("Failed to allocate anonymous memory for %s: %s", info.path.c_str(), strerror(errno));
            continue;
        }

        if ((info.perms & PROT_READ) == 0) {
            LOGI("Temporarily enabling read permission: %s", info.path.c_str());
            mprotect(address, aligned_size, PROT_READ);
        }

        /* Copy the in-memory data to new virtual location via memmove */
        std::memmove(map, address, aligned_size);

        /* Commit new anonymous memory to original virtual address via mremap */
        void *remapped = mremap(map, aligned_size, aligned_size, MREMAP_MAYMOVE | MREMAP_FIXED, address);
        if (remapped == MAP_FAILED) {
            LOGE("Failed to mremap %s: %s", info.path.c_str(), strerror(errno));
            munmap(map, aligned_size);
            continue;
        }

        /* Re-apply original memory protections (or PROT_READ if none were set) */
        int final_perms = (info.perms != 0) ? info.perms : PROT_READ;
        mprotect(address, aligned_size, final_perms);
        LOGI("Remapped segment [%" PRIxPTR "-%" PRIxPTR "] (%s)", aligned_start, aligned_end, info.path.c_str());
    }

    LOGI("Remap completed for %s", lib_name.c_str());
}
