# KsuRusda (Anti-Detection Frida for KernelSU / Magisk / APatch)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Android%20(ARM64%20%2F%20ARM32)-blue.svg)](https://github.com)
[![Zygisk](https://img.shields.io/badge/Hook-Zygisk-brightgreen.svg)](https://github.com)

> **项目声明 (Derivative Work Statement)**:  
> 本项目是基于 **[gorkemgun/ksu-frida](https://github.com/gorkemgun/ksu-frida)** 与 **[lico-n/ZygiskFrida](https://github.com/lico-n/ZygiskFrida)** 进行深度二次开发、功能扩展与维护的增强版本。  
> 感谢原作者与开源社区前驱者的卓越贡献！向原项目及所有贡献者致敬。

---

## 核心特性 (Key Features)

- **去特征 Frida 内核 (Rusda)**：内置深度去特征 Gadget，抹除 `gmain`、`gdbus`、`gum-js-loop` 线程名与 `frida:rpc`、`memfd:frida-agent` 等特征，兼容官方 Frida 客户端与脚本。
- **双模式运行**：
  - **联网监听模式**：常规 TCP 端口监听，支持 PC 端动态交互与调试。
  - **离线免联网脚本模式**：专为无网络权限应用设计，进程内直接加载本地 JS 脚本，支持热重载。
- **隐蔽注入机制**：基于 Zygisk `postAppSpecialize` 阶段动态注入，免修改 APK 签名，免 ptrace，自动执行内存匿名重映射（Library Remapping）抹除 `/proc/self/maps` 痕迹。
- **高级控制**：支持自定义启动延时（Startup Delay）避开早期检测，以及子进程拦截（Child Gating：Freeze / Kill / Inject）。
- **WebUI 控制端**：适配 KernelSU / APatch / Magisk WebUI，支持系统应用与多用户分身筛选、模式切换、脚本编辑与脱机实时 Logcat 查看。

---

## 运行要求 (Prerequisites)

- 已 Root 的 Android 设备（Android 8.0 ~ 15+）
- Root 解决方案：**KernelSU** / **Magisk** (v24+) / **APatch**
- 开启 **Zygisk** 支持（如 Zygisk Next、KernelSU 内置 Zygisk 或 Magisk Zygisk）

---

## 快速上手 (Quick Start)

### 1. 安装模块
1. 前往本项目的 [Releases](../../releases) 页面下载最新的 `ksurusda-*.zip` 刷机包。
2. 在 **KernelSU Manager**、**Magisk** 或 **APatch** 模块管理页面中从本地安装 ZIP 包。
3. 重启设备生效。

---

### 2. 配置目标应用

#### 选项 A: 通过 WebUI 管理界面（推荐）
1. 打开 **KernelSU Manager** -> **模块 (Modules)** -> **ksurusda** -> 点击 **WebUI**。
2. 点击 **「+ 添加应用」** 勾选需要 Hook 的目标应用（支持开启系统应用或多用户分身）。
3. 选择所需模式：
   - **联网监听模式**：可配置监听端口（默认 `27042`）与绑定地址；
   - **离线脚本模式**：可在 WebUI 内直接编写/粘贴 Frida JS 脚本。
4. 点击卡片上的 **「重启应用」** 即可生效。

#### 选项 B: 通过 ADB / 终端手动配置
```shell
# 复制示例配置文件
adb shell su -c 'cp /data/local/tmp/libsec/config.json.example /data/local/tmp/libsec/config.json'

# 修改目标包名
adb shell su -c "sed -i 's/com.example.package/your.target.app/' /data/local/tmp/libsec/config.json"
```

---

### 3. 连接 Frida 调试 (仅联网模式)

在目标应用启动后，在 PC 端终端建立端口转发并连接：

```shell
# 转发端口
adb forward tcp:27042 tcp:27042

# 使用 Frida 附加并加载你的脚本
frida -H 127.0.0.1:27042 -n Gadget -l your_script.js
```

---

## 配置文件说明 (Configuration)

模块核心配置文件与动态库均存放于 `/data/local/tmp/libsec/` 目录：

| 文件名 | 作用说明 |
|---|---|
| `config.json` | 目标应用包名、注入延时、子进程拦截策略等主配置 |
| `libsecmon.config.so` | Frida Gadget 底层配置文件（JSON 格式，支持 listen/script 模式） |
| `libsecmon.so` | 64 位 Rusda Gadget 核心动态库（模块自动安装部署） |
| `libsecmon32.so` | 32 位 Rusda Gadget 核心动态库（模块自动安装部署） |
| `script.js` | 离线脚本模式下的 Frida 注入脚本文件 |

标准 `config.json` 结构示例：
```json
{
    "targets": [
        {
            "app_name": "com.example.targetapp",
            "enabled": true,
            "kernel_assisted_evasion": false,
            "start_up_delay_ms": 0,
            "injected_libraries": [
                { "path": "/data/local/tmp/libsec/libsecmon.so" }
            ],
            "child_gating": {
                "enabled": false,
                "mode": "freeze",
                "injected_libraries": []
            }
        }
    ]
}
```

---

## 编译构建 (Building from Source)

本项目采用 Gradle 工具链构建：

```shell
# 编译生成 Release 模块 ZIP
./gradlew :module:assembleRelease

# 输出文件位于: out/
```

如果设备已连接 ADB，可一键编译、刷入并重启：
```shell
./gradlew :module:flashAndRebootZygiskRelease
```

---

## 免责声明 (Disclaimer)

本项目（包括所有源码、文档与二进制文件）仅供合法的安全研究、应用逆向工程分析、安全审计与学术技术交流使用。  
使用者须对使用本项目的行为及其直接或间接后果承担全部法律责任。禁止将本项目用于任何破坏计算机系统、侵犯他人隐私或违反所在国家/地区法律法规的非法用途。

---

## 致谢与开源鸣谢 (Credits & Acknowledgments)

本项目是在众多优秀的开源安全项目和开发者成果基础之上演进发展而来，由衷感谢以下项目与原作者：

- **[lico-n](https://github.com/lico-n)** — [ZygiskFrida](https://github.com/lico-n/ZygiskFrida) 原始项目作者，奠定了 Zygisk 注入 Frida 的核心基石。
- **[gorkemgun](https://github.com/gorkemgun)** — [KsuFrida](https://github.com/gorkemgun/ksu-frida) 项目作者，提供了优秀的 KernelSU 模块架构与 WebUI 雏形。
- **[electrondefuser](https://github.com/electrondefuser)** — 贡献了内存重映射（Library Remapper）、子进程拦截（Child Gating）及高级配置机制。
- **[taisuii](https://github.com/taisuii)** — [Rusda](https://github.com/taisuii/rusda) 深度反检测/去特征魔改版 Frida 内核作者。
- **[hexhacking/xDL](https://github.com/hexhacking/xDL)** — 强大的 Android dlopen 符号增强与链接库工具。
- **[Perfare/Zygisk-Il2CppDumper](https://github.com/Perfare/Zygisk-Il2CppDumper)** — 架构设计灵感与技术启发。

---

## 开源许可证 (License)

本项目遵循 **[MIT License](LICENSE)** 开源协议。在遵循协议的前提下，您可以自由分发、修改与使用。
