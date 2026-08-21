#include "child_gating.h"

#include <dobby.h>
#include <dlfcn.h>
#include <unistd.h>
#include <sys/types.h>
#include <csignal>
#include <cstdlib>
#include <string>
#include <vector>

#include "config.h"
#include "inject.h"
#include "log.h"

static std::string child_gating_mode;
static std::vector<std::string> injected_libraries;

static pid_t (*orig_fork)() = nullptr;
static pid_t (*orig_vfork)() = nullptr;

static void handle_child_action(const std::string &logContext) {
    if (child_gating_mode == "kill") {
        LOGI("%skilling child process", logContext.c_str());
        _exit(0);
    }

    if (child_gating_mode == "freeze") {
        LOGI("%sfreezing child process", logContext.c_str());
        while (true) {
            pause();
        }
    }

    if (child_gating_mode == "inject") {
        for (const auto &lib_path : injected_libraries) {
            LOGI("%sInjecting %s", logContext.c_str(), lib_path.c_str());
            inject_lib(lib_path, logContext);
        }
        return;
    }

    LOGW("%sunknown child_gating_mode: %s", logContext.c_str(), child_gating_mode.c_str());
}

static pid_t fork_replacement() {
    pid_t parent_pid = getpid();
    LOGI("[child_gating][pid %d] intercepted fork", parent_pid);

    if (!orig_fork) {
        LOGE("[child_gating] orig_fork is null!");
        return -1;
    }

    pid_t child_pid = orig_fork();
    if (child_pid != 0) {
        if (child_pid > 0) {
            LOGI("[child_gating][pid %d] forked child pid: %d", parent_pid, child_pid);
        }
        return child_pid;
    }

    pid_t self_pid = getpid();
    std::string logContext = "[child_gating][fork child pid " + std::to_string(self_pid) + "] ";
    handle_child_action(logContext);

    return 0;
}

static pid_t vfork_replacement() {
    pid_t parent_pid = getpid();
    LOGI("[child_gating][pid %d] intercepted vfork", parent_pid);

    // If freeze or kill, we can execute it via standard fork or orig_vfork
    if (child_gating_mode == "kill" || child_gating_mode == "freeze") {
        pid_t child_pid = orig_fork ? orig_fork() : (orig_vfork ? orig_vfork() : -1);
        if (child_pid != 0) {
            return child_pid;
        }
        pid_t self_pid = getpid();
        std::string logContext = "[child_gating][vfork child pid " + std::to_string(self_pid) + "] ";
        handle_child_action(logContext);
        _exit(0);
    }

    // For injection in vfork, use orig_fork to avoid corrupting parent address space
    if (orig_fork) {
        pid_t child_pid = orig_fork();
        if (child_pid != 0) {
            return child_pid;
        }
        pid_t self_pid = getpid();
        std::string logContext = "[child_gating][vfork child pid " + std::to_string(self_pid) + "] ";
        handle_child_action(logContext);
        return 0;
    }

    if (orig_vfork) {
        return orig_vfork();
    }

    return -1;
}

void enable_child_gating(child_gating_config const &cfg) {
    child_gating_mode = cfg.mode;
    injected_libraries = cfg.injected_libraries;

    LOGI("[child_gating] Enabling child gating (mode: %s)", child_gating_mode.c_str());

    void *forkAddr = dlsym(RTLD_DEFAULT, "fork");
    if (!forkAddr) {
        forkAddr = dlsym(RTLD_NEXT, "fork");
    }
    LOGI("[child_gating] fork address: %p", forkAddr);

    void *vforkAddr = dlsym(RTLD_DEFAULT, "vfork");
    if (!vforkAddr) {
        vforkAddr = dlsym(RTLD_NEXT, "vfork");
    }
    LOGI("[child_gating] vfork address: %p", vforkAddr);

    if (forkAddr) {
        int ret = DobbyHook(
            forkAddr,
            reinterpret_cast<void *>(fork_replacement),
            reinterpret_cast<void **>(&orig_fork));
        if (ret == 0) {
            LOGI("[child_gating] fork hook installed successfully");
        } else {
            LOGE("[child_gating] Failed to hook fork, DobbyHook code: %d", ret);
        }
    }

    if (vforkAddr) {
        int ret = DobbyHook(
            vforkAddr,
            reinterpret_cast<void *>(vfork_replacement),
            reinterpret_cast<void **>(&orig_vfork));
        if (ret == 0) {
            LOGI("[child_gating] vfork hook installed successfully");
        } else {
            LOGE("[child_gating] Failed to hook vfork, DobbyHook code: %d", ret);
        }
    }

    LOGI("[child_gating] Child gating initialized");
}

