#include "remapper.h"

#include <link.h>
#include <sys/mman.h>
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

    for (const auto &info : maps) {
        void *address = reinterpret_cast<void *>(info.start);
        size_t size = info.end - info.start;

        void *map = mmap(nullptr, size, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
        if (map == MAP_FAILED) {
            LOGE("Failed to allocate memory for %s: %s", info.path.c_str(), strerror(errno));
            continue;
        }

        if ((info.perms & PROT_READ) == 0) {
            LOGI("Temporarily enabling read permission: %s", info.path.c_str());
            mprotect(address, size, PROT_READ);
        }

        /* Copy the in-memory data to new virtual location via memmove */
        std::memmove(map, address, size);

        /* Commit new anonymous memory to original virtual address via mremap */
        void *remapped = mremap(map, size, size, MREMAP_MAYMOVE | MREMAP_FIXED, reinterpret_cast<void *>(info.start));
        if (remapped == MAP_FAILED) {
            LOGE("Failed to mremap %s: %s", info.path.c_str(), strerror(errno));
            munmap(map, size);
            continue;
        }

        /* Re-apply original memory protections */
        mprotect(reinterpret_cast<void *>(info.start), size, info.perms);
        LOGI("Remapped segment [%" PRIxPTR "-%" PRIxPTR "] (%s)", info.start, info.end, info.path.c_str());
    }

    LOGI("Remap completed for %s", lib_name.c_str());
}
