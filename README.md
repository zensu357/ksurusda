# KsuRusda (Anti-Detection Frida for KernelSU / Magisk / APatch)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Android%20(ARM64%20%2F%20ARM32)-blue.svg)](https://github.com)
[![Zygisk](https://img.shields.io/badge/Hook-Zygisk-brightgreen.svg)](https://github.com)

> 💡 **项目声明 (Derivative Work Statement)**:  
> 本项目是基于 **[gorkemgun/ksu-frida](https://github.com/gorkemgun/ksu-frida)** 与 **[lico-n/ZygiskFrida](https://github.com/lico-n/ZygiskFrida)** 进行深度二次开发、功能扩展与维护的增强版本。  
> 感谢原作者与开源社区前驱者的卓越贡献！向原项目及所有贡献者致敬。

---

## 🌟 核心特性 (Key Features)

- 🛡️ **集成 Rusda 深度去特征 Frida 内核 (v17.15.0)**：
  - 源码级与二进制级抹除 `gmain`、`gdbus`、`gum-js-loop` 线程特征名。
  - 剔除 `frida:rpc` 标识、`memfd:frida-agent` 映射名及 `FridaScriptEngine` 等显著特征，完美规避各类常规反 Frida 检测手段。
  - 保持与官方 Frida CLI 及客户端脚本 100% 协议兼容。
- ⚡ **双模式灵活切换 (Dual Operation Modes)**：
  - **🌐 联网监听模式 (Listen Mode)**：常规 TCP 端口监听，支持 PC 端 Frida 动态交互与热调试。
  - **⚡ 离线免联网脚本模式 (Offline Script Mode)**：专为无 `android.permission.INTERNET` 权限或纯离线应用设计，由 Gadget 直接在进程内加载本地 JS 脚本，无需开放网络端口，支持脚本热重载。
- 🚀 **现代化高性能 WebUI**：
  - 消除 30s 初始加载延迟，采用按需懒加载与平滑渲染。
  - 移动端全响应式设计，适配小屏及异形屏。
  - 目标勾选即时自动持久化、原子化配置安全写入，避免配置丢失或格式错乱。
- 🔒 **深度隐蔽注入机制**：
  - **无需修改 APK**：通过 Zygisk `postAppSpecialize` 阶段动态载入，保留原 APK 完整签名。
  - **免 ptrace**：规避基于 ptrace 附加的防护检测。
  - **内存匿名重映射 (Library Remapping)**：自动从 `/proc/self/maps` 中抹除注入库的原物理路径。
- ⚙️ **多级高级控制**：
  - **启动延迟 (Startup Delay)**：可微调毫秒级延时注入，避开应用启动时期的强反调试与检测。
  - **子进程拦截 (Child Gating)**：支持对应用派生子进程执行冻结 (Freeze)、终止 (Kill) 或递归注入 (Inject)。
  - **多库链式加载**：支持自定义指定并加载多个 SO 动态库。

---

## 📋 运行要求 (Prerequisites)

- 已 Root 的 Android 设备（Android 8.0 ~ 15+）
- Root 解决方案：**KernelSU** / **Magisk** (v24+) / **APatch**
- 开启 **Zygisk** 模块支持（如 Zygisk Next、KernelSU 内置 Zygisk 或 Magisk Zygisk）

---

## 🚀 快速上手 (Quick Start)

### 1. 安装模块
1. 前往本项目的 [Releases](../../releases) 页面下载最新的 `KsuRusda-v*.zip` 刷机包。
2. 在 **KernelSU Manager**、**Magisk** 或 **APatch** 模块管理页面中从本地安装 ZIP 包。
3. 重启设备生效。

---

### 2. 配置目标应用

#### 选项 A: 通过 WebUI 管理界面（推荐）
1. 打开 **KernelSU Manager** → **模块 (Modules)** → **KsuRusda** → 点击 **WebUI**。
2. 点击 **「+ 添加应用」** 勾选需要 Hook 的目标应用。
3. 选择所需模式：
   - **联网监听模式**：可修改监听端口（默认 `27042`）与绑定地址；
   - **离线脚本模式**：可直接在 WebUI 内编写/粘贴 Frida JS 脚本并保存。
4. 点击卡片上的 **「重启应用」** 即可完成加载。

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

## ⚙️ 配置文件说明 (Configuration)

模块核心配置文件与动态库均存放于 `/data/local/tmp/libsec/` 目录：

| 文件名 | 作用说明 |
|---|---|
| `config.json` | 目标应用包名、注入延时、子进程拦截策略等主配置 |
| `libsecmon.config.so` | Frida Gadget 的底层配置文件（JSON 格式，支持 listen/script 模式） |
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

## 🛠️ 编译构建 (Building from Source)

本项目采用现代 Gradle 工具链构建，支持本地或 CI 自动编译：

```shell
# 编译生成 Release 模块 ZIP
./gradlew :module:assembleRelease

# 输出文件位于: out/magisk_module_zygisk_release/ 或 out/
```

如果设备已连接 ADB，可一键编译、刷入并重启：
```shell
./gradlew :module:flashAndRebootZygiskRelease
```

---

## ⚠️ 免责声明 (Disclaimer)

本项目（包括所有源码、文档与二进制文件）仅供合法的安全研究、应用逆向工程分析、安全审计与学术技术交流使用。  
使用者须对使用本项目的行为及其直接或间接后果承担全部法律责任。禁止将本项目用于任何破坏计算机系统、侵犯他人隐私或违反所在国家/地区法律法规的非法用途。

---

## 💖 致谢与开源鸣谢 (Credits & Acknowledgments)

本项目是在众多优秀的开源安全项目和开发者成果基础之上演进发展而来，由衷感谢以下项目与原作者：

- **[lico-n](https://github.com/lico-n)** — [ZygiskFrida](https://github.com/lico-n/ZygiskFrida) 原始项目作者，奠定了 Zygisk 注入 Frida 的核心基石。
- **[gorkemgun](https://github.com/gorkemgun)** — [KsuFrida](https://github.com/gorkemgun/ksu-frida) 项目作者，提供了优秀的 KernelSU 模块架构与 WebUI 雏形。
- **[electrondefuser](https://github.com/electrondefuser)** — 贡献了内存重映射（Library Remapper）、子进程拦截（Child Gating）及高级配置机制。
- **[taisuii](https://github.com/taisuii)** — [Rusda](https://github.com/taisuii/rusda) 深度反检测/去特征魔改版 Frida 内核作者。
- **[hexhacking/xDL](https://github.com/hexhacking/xDL)** — 强大的 Android dlopen 符号增强与链接库工具。
- **[Perfare/Zygisk-Il2CppDumper](https://github.com/Perfare/Zygisk-Il2CppDumper)** — 架构设计灵感与技术启发。

---

## 📄 开源许可证 (License)

本项目遵循 **[MIT License](LICENSE)** 开源协议。在遵循协议的前提下，您可以自由分发、修改与使用。
