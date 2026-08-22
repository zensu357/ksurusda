const CONFIG_PATH = "/data/local/tmp/libsec/config.json";
const GADGET_CONFIG_PATH = "/data/local/tmp/libsec/libsecmon.config.so";
const DEFAULT_SCRIPT_PATH = "/data/local/tmp/libsec/script.js";

let config = { targets: [] };
let allApps = [];
let appLabels = {};
let appsLoaded = false;
let isFetchingApps = false;
let callbackId = 0;
let currentGadgetMode = "listen";
let currentLang = localStorage.getItem("ksufrida_lang") || (navigator.language && navigator.language.startsWith("zh") ? "zh" : "en");

// ── i18n Dictionary ──────────────────────────────────────────────────────────
const i18n = {
    zh: {
        appTitle: "KsuFrida 注入管理",
        appSubtitle: "Zygisk Frida Gadget 动态注入与隐蔽框架",
        targetsTitle: "注入目标列表",
        btnAddTarget: "添加应用",
        btnHelp: "📖 详解",
        helpModalTitle: "📖 KsuFrida 功能详解与使用指南",
        gadgetConfigTitle: "Frida Gadget 交互模式",
        tabListen: "🌐 联网监听模式",
        tabScript: "⚡ 离线免联网脚本模式",
        tabRaw: "📝 高级 JSON",
        listenModeDesc: "适用于拥有网络权限的常规应用。Gadget 在指定端口启动 TCP 监听，供电脑端 Frida 连接。",
        lblPort: "监听端口 (Port)",
        lblAddress: "绑定地址 (Address)",
        btnCopyAdb: "📋 复制 ADB 转发",
        btnApplyGadget: "应用并保存",
        scriptModeNoticeTitle: "🛡️ 专为无网络权限/离线应用设计",
        scriptModeNoticeDesc: "应用无需任何网络权限或开放端口，Gadget 加载时直接在进程内运行指定的本地 JS 脚本，修改脚本后支持自动热重载。",
        lblScriptPath: "本地脚本绝对路径",
        lblScriptContent: "Frida JS 脚本代码 (直接在手机上编写)",
        btnSaveScript: "💾 仅存脚本",
        btnSaveGadget: "保存原始 JSON",
        btnSaveAll: "💾 保存全部配置",
        btnReload: "🔄 重新加载",
        modalSelectApp: "选择目标应用",
        searchPlaceholder: "搜索应用名称或包名...",
        loadingApps: "正在快速加载已安装应用...",
        noTargets: "暂无配置的注入目标，请点击右上角「+ 添加应用」开始",
        noAppsFound: "未找到匹配的第三方应用",
        statusEnabled: "已启用",
        statusDisabled: "已停用",
        ksieLabel: "内核隐蔽 (KSIE)",
        ksieDesc: "启用内核级注入痕迹抹除 (需 KernelSU 特性支持)",
        delayLabel: "启动延时 (毫秒)",
        delayDesc: "延后加载 Gadget，有效规避 App 启动早期的安全检测",
        libsLabel: "注入动态库路径",
        libsDesc: "每行一个 SO 绝对路径，按先后顺序加载",
        childGatingLabel: "子进程拦截 (Child Gating)",
        childModeLabel: "拦截策略",
        modeFreeze: "❄️ 冻结进程 (Freeze)",
        modeKill: "⛔ 终止进程 (Kill)",
        modeInject: "💉 同步注入 (Inject)",
        childLibsLabel: "子进程注入库路径",
        btnRestart: "重启应用",
        btnDelete: "移除",
        toggleDetails: "高级选项",
        toastConfigSaved: "✅ 配置已安全保存",
        toastGadgetSaved: "✅ Gadget 模式配置已生效",
        toastScriptSaved: "✅ JS 脚本已保存并设置读取权限",
        toastRestarting: "🔄 正在重启应用...",
        toastRestarted: "✅ 应用已重启: ",
        toastCopiedAdb: "📋 已复制 ADB 转发命令到剪贴板",
        toastAlreadyAdded: "⚠️ 该应用已在目标列表中"
    },
    en: {
        appTitle: "KsuFrida Manager",
        appSubtitle: "Dynamic Frida Gadget Injection via Zygisk",
        targetsTitle: "Injection Targets",
        btnAddTarget: "Add App",
        btnHelp: "📖 Help",
        helpModalTitle: "📖 KsuFrida Documentation & Guide",
        gadgetConfigTitle: "Frida Gadget Interaction Mode",
        tabListen: "🌐 Online Listen Mode",
        tabScript: "⚡ Offline Script Mode",
        tabRaw: "📝 Raw JSON",
        listenModeDesc: "For apps with internet permissions. Gadget opens a TCP port waiting for PC Frida client to connect.",
        lblPort: "Listen Port",
        lblAddress: "Bind Address",
        btnCopyAdb: "📋 Copy ADB Forward",
        btnApplyGadget: "Apply & Save",
        scriptModeNoticeTitle: "🛡️ Designed for No-Internet / Offline Apps",
        scriptModeNoticeDesc: "Requires zero network permissions or open ports. Directly executes your local JS script on load with live hot-reload support.",
        lblScriptPath: "Absolute Script Path",
        lblScriptContent: "Frida JS Script (Edit directly on phone)",
        btnSaveScript: "💾 Save Script",
        btnSaveGadget: "Save Raw JSON",
        btnSaveAll: "💾 Save All Settings",
        btnReload: "🔄 Reload",
        modalSelectApp: "Select Target App",
        searchPlaceholder: "Search app label or package...",
        loadingApps: "Loading installed applications...",
        noTargets: "No targets configured. Tap + Add App to begin.",
        noAppsFound: "No matching applications found",
        statusEnabled: "Enabled",
        statusDisabled: "Disabled",
        ksieLabel: "Kernel Evasion (KSIE)",
        ksieDesc: "Hide injection artifacts via kernel assistance",
        delayLabel: "Startup Delay (ms)",
        delayDesc: "Delay injection to bypass early startup detections",
        libsLabel: "Injected Libraries",
        libsDesc: "One absolute SO path per line, injected sequentially",
        childGatingLabel: "Child Gating",
        childModeLabel: "Child Action Mode",
        modeFreeze: "❄️ Freeze Process",
        modeKill: "⛔ Kill Process",
        modeInject: "💉 Inject Libraries",
        childLibsLabel: "Child Injected Libraries",
        btnRestart: "Restart",
        btnDelete: "Remove",
        toggleDetails: "Advanced Options",
        toastConfigSaved: "✅ Config saved successfully",
        toastGadgetSaved: "✅ Gadget configuration applied",
        toastScriptSaved: "✅ JS script saved with 0644 permissions",
        toastRestarting: "🔄 Restarting application...",
        toastRestarted: "✅ Application restarted: ",
        toastCopiedAdb: "📋 Copied ADB command to clipboard",
        toastAlreadyAdded: "⚠️ App is already added"
    }
};

function t(key) {
    return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.en[key]) || key;
}

function updateStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
        const key = el.getAttribute("data-i18n");
        el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        const key = el.getAttribute("data-i18n-placeholder");
        el.placeholder = t(key);
    });
    const btnLang = document.getElementById("btn-lang-toggle");
    if (btnLang) {
        btnLang.textContent = currentLang === "zh" ? "English" : "中文";
    }
    renderHelpContent();
}

function toggleLanguage() {
    currentLang = currentLang === "zh" ? "en" : "zh";
    localStorage.setItem("ksufrida_lang", currentLang);
    updateStaticI18n();
    renderTargets();
}

// ── Help Documentation Content ───────────────────────────────────────────────
function renderHelpContent() {
    const el = document.getElementById("help-content");
    if (!el) return;

    if (currentLang === "zh") {
        el.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px 12px;">
                    <strong style="color:var(--primary);">💡 什么是 KsuFrida？</strong>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-main);">
                        KsuFrida 是一个基于 <strong>Zygisk</strong> 的免 Root 检测 Frida 注入工具。在应用特化（<code>postAppSpecialize</code>）阶段将 Frida Gadget 动态注入目标进程，<strong>无需重打包 APK、不破坏应用签名、无需 ptrace 挂钩</strong>，并通过<strong>内存重映射（Remapping）</strong>技术抹除 maps 中的注入痕迹。
                    </div>
                </div>

                <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:10px 12px;">
                    <strong style="color:var(--success);">⚡ 无网络权限应用应对方案 (免联网离线模式)</strong>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-main);">
                        如果目标 App 没有 <code>android.permission.INTERNET</code> 权限，传统 Frida Gadget 监听模式会因无法创建 Socket 报错崩溃。<br>
                        <strong>解决方案</strong>：在 WebUI 中切换到 <strong>「⚡ 离线免联网脚本模式」</strong>，Gadget 将直接加载执行手机本地的 JS 脚本（如 <code>script.js</code>），完全无需网络权限！
                    </div>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">🚀 快速上手 4 步法 (联网模式)</h4>
                    <ol style="padding-left:18px; font-size:12px; display:flex; flex-direction:column; gap:6px;">
                        <li>点击上方 <strong>「+ 添加应用」</strong> 选择目标 App，确保开启右侧开关。</li>
                        <li>点击底部 <strong>「💾 保存全部配置」</strong>。</li>
                        <li>点击目标应用卡片上的 <strong>「重启应用」</strong> 按钮启动目标。</li>
                        <li>在电脑端终端执行端口转发并连接 Frida：
                            <pre style="background:#090d16; padding:6px 8px; border-radius:6px; margin-top:4px; font-family:var(--font-mono); color:#38bdf8; font-size:11px; overflow-x:auto;">adb forward tcp:27042 tcp:27042\nfrida -H 127.0.0.1:27042 -n Gadget -l script.js</pre>
                        </li>
                    </ol>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">⚙️ 目标应用配置项详解</h4>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">1. 启动延时 (Startup Delay ms)</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                设置延后注入 Frida Gadget 的毫秒数（例如 <code>1000</code> ~ <code>3000</code> ms）。可用于规避加固壳或应用启动阶段执行的强反调试与环境检测。
                            </div>
                        </div>
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">2. 内核隐蔽 (Kernel Evasion / KSIE)</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                配合兼容的 KernelSU 内核补丁使用，可在内核层面进一步隐蔽 Zygisk 注入相关的进程特征。
                            </div>
                        </div>
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">3. 注入动态库路径 (Injected Libraries)</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                • <strong>64位应用（默认）</strong>：<code>/data/local/tmp/libsec/libsecmon.so</code><br>
                                • <strong>32位应用</strong>：<code>/data/local/tmp/libsec/libsecmon32.so</code><br>
                                • 支持填入自定义的 SO 绝对路径（每行一个），模块将按先后顺序加载。
                            </div>
                        </div>
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">4. 子进程拦截 (Child Gating)</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                拦截目标 App 调用的 <code>fork</code> / <code>vfork</code>：<br>
                                • <strong>❄️ 冻结 (Freeze)</strong>：将子进程挂起，防止加固利用独立的探测子进程检测调试；<br>
                                • <strong>⛔ 终止 (Kill)</strong>：立即退出子进程；<br>
                                • <strong>💉 注入 (Inject)</strong>：向子进程同步注入独立的 Frida Gadget（需配置不同端口避免冲突）。
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">🛠️ 排查与调试日志</h4>
                    <div style="font-size:12px; color:var(--text-muted);">
                        如遇到未注入或连接失败，可在电脑终端查看模块实时输出日志：
                        <pre style="background:#090d16; padding:6px 8px; border-radius:6px; margin-top:4px; font-family:var(--font-mono); color:#10b981; font-size:11px;">adb logcat -s KsuFrida</pre>
                    </div>
                </div>
            </div>
        `;
    } else {
        el.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px 12px;">
                    <strong style="color:var(--primary);">💡 What is KsuFrida?</strong>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-main);">
                        KsuFrida is a <strong>Zygisk-based</strong> module designed to dynamically inject the Frida Gadget into target Android applications at the <code>postAppSpecialize</code> phase. It preserves APK signature integrity, bypasses ptrace checks, and utilizes <strong>memory remapping</strong> to hide Gadget traces from <code>/proc/self/maps</code>.
                    </div>
                </div>

                <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:10px 12px;">
                    <strong style="color:var(--success);">⚡ No-Internet App Solution (Offline Script Mode)</strong>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-main);">
                        Apps without <code>android.permission.INTERNET</code> will crash when attempting to bind TCP ports in listen mode.<br>
                        <strong>Solution</strong>: Switch to <strong>"⚡ Offline Script Mode"</strong> to directly execute local JS scripts with full hot-reload capabilities.
                    </div>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">🚀 Quick Start Guide</h4>
                    <ol style="padding-left:18px; font-size:12px; display:flex; flex-direction:column; gap:6px;">
                        <li>Tap <strong>"+ Add App"</strong> to select your target package and toggle it on.</li>
                        <li>Tap <strong>"💾 Save All Settings"</strong> at the bottom.</li>
                        <li>Tap the <strong>"Restart"</strong> button on the target card to launch the application.</li>
                        <li>Forward the port on PC and attach via Frida CLI:
                            <pre style="background:#090d16; padding:6px 8px; border-radius:6px; margin-top:4px; font-family:var(--font-mono); color:#38bdf8; font-size:11px; overflow-x:auto;">adb forward tcp:27042 tcp:27042\nfrida -H 127.0.0.1:27042 -n Gadget -l script.js</pre>
                        </li>
                    </ol>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">⚙️ Configuration Options</h4>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">1. Startup Delay (ms)</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                Postpone library injection (e.g. <code>1000</code> - <code>3000</code> ms) to bypass early anti-debug checks executed at startup.
                            </div>
                        </div>
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">2. Injected Libraries</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                • <strong>64-bit App (Default)</strong>: <code>/data/local/tmp/libsec/libsecmon.so</code><br>
                                • <strong>32-bit App</strong>: <code>/data/local/tmp/libsec/libsecmon32.so</code><br>
                                • Custom SO paths can be listed one per line.
                            </div>
                        </div>
                        <div style="background:var(--surface-card); padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
                            <strong style="color:var(--text-main);">3. Child Gating</strong>
                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">
                                Intercepts <code>fork</code> / <code>vfork</code> calls:<br>
                                • <strong>❄️ Freeze</strong>: Hangs child process to stop detached anti-debug scanners;<br>
                                • <strong>⛔ Kill</strong>: Terminates child processes immediately;<br>
                                • <strong>💉 Inject</strong>: Injects gadget copies into child processes.
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--primary); margin-bottom:6px;">🛠️ Troubleshooting & Logs</h4>
                    <div style="font-size:12px; color:var(--text-muted);">
                        View real-time injection and module logs via:
                        <pre style="background:#090d16; padding:6px 8px; border-radius:6px; margin-top:4px; font-family:var(--font-mono); color:#10b981; font-size:11px;">adb logcat -s KsuFrida</pre>
                    </div>
                </div>
            </div>
        `;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function utf8ToBase64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function getAvatarColor(str) {
    const colors = [
        "linear-gradient(135deg, #38bdf8, #2563eb)",
        "linear-gradient(135deg, #10b981, #059669)",
        "linear-gradient(135deg, #f59e0b, #d97706)",
        "linear-gradient(135deg, #ec4899, #be185d)",
        "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        "linear-gradient(135deg, #06b6d4, #0e7490)"
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
}

// ── KSU exec wrapper using string-based callback registration ────────────────
function exec(cmd) {
    return new Promise(function (resolve) {
        var name = "_ksu_cb_" + (++callbackId);
        window[name] = function (errno, stdout, stderr) {
            delete window[name];
            resolve({ errno: errno, stdout: stdout, stderr: stderr });
        };
        ksu.exec(cmd, "{}", name);
    });
}

// ── Atomic & Reliable File Writer ────────────────────────────────────────────
async function writeTextFile(filePath, content, mode = "644") {
    var dir = filePath.substring(0, filePath.lastIndexOf("/"));
    var b64 = utf8ToBase64(content);
    var tmpFile = filePath + ".tmp_" + Date.now();

    // 1. 标准兼容 Base64 管道解码 (杜绝任何 <<< 语法)
    var cmd = 
        "mkdir -p " + dir + " && " +
        "(echo '" + b64 + "' | base64 -d > \"" + tmpFile + "\" 2>/dev/null || " +
        "echo '" + b64 + "' | busybox base64 -d > \"" + tmpFile + "\" 2>/dev/null) && " +
        "[ -s \"" + tmpFile + "\" ] && mv -f \"" + tmpFile + "\" \"" + filePath + "\" && chmod " + mode + " \"" + filePath + "\"";

    var r = await exec(cmd);
    if (r.errno === 0) return true;

    // 2. 如果 Base64 命令在当前系统不支持，尝试使用标准 Heredoc 原生写入
    var heredocCmd = "mkdir -p " + dir + " && cat << 'KSU_EOF' > \"" + filePath + "\"\n" + content + "\nKSU_EOF\nchmod " + mode + " \"" + filePath + "\"";
    var r2 = await exec(heredocCmd);
    return r2.errno === 0;
}

// ── Config I/O ───────────────────────────────────────────────────────────────
async function loadConfig() {
    var r = await exec("cat " + CONFIG_PATH);
    if (r.errno === 0 && r.stdout.trim().length > 0) {
        try {
            config = JSON.parse(r.stdout);
            if (!config.targets) config.targets = [];
            renderTargets();
            return;
        } catch (e) {
            console.error("Config JSON parse error:", e);
        }
    }

    // 仅在真实 config.json 完全不存在时才尝试读取样例
    var chk = await exec("[ -f " + CONFIG_PATH + " ] && echo 1 || echo 0");
    if (chk.stdout.trim() === "0") {
        var ex = await exec("cat /data/local/tmp/libsec/config.json.example");
        if (ex.errno === 0 && ex.stdout.trim().length > 0) {
            try { config = JSON.parse(ex.stdout); } catch (_) {}
        }
    } else {
        config = { targets: [] };
    }
    renderTargets();
}

// 收集并持久化所有配置 (目标配置 + Gadget 模式 + 脚本内容)
async function saveAllConfig(silent = false) {
    // 1. 同步 DOM 中所有目标卡片的最新输入值
    collectDOMTargetInputs();

    // 2. 根据当前模式同步 Gadget 配置与脚本
    if (currentGadgetMode === "listen") {
        updateListenConfig();
    } else if (currentGadgetMode === "script") {
        updateScriptConfig();
    }

    // 3. 写入 config.json
    var targetJson = JSON.stringify(config, null, 4);
    var ok1 = await writeTextFile(CONFIG_PATH, targetJson, "644");

    // 4. 写入 libsecmon.config.so (Gadget 配置)
    var gadgetJson = document.getElementById("gadget-editor").value;
    var ok2 = await writeTextFile(GADGET_CONFIG_PATH, gadgetJson, "644");

    // 5. 如果处于离线脚本模式，同步写入 script.js
    var ok3 = true;
    if (currentGadgetMode === "script") {
        var scriptPath = document.getElementById("script-path").value || DEFAULT_SCRIPT_PATH;
        var scriptCode = document.getElementById("script-editor").value;
        ok3 = await writeTextFile(scriptPath, scriptCode, "666");
    }

    if (ok1 && ok2 && ok3) {
        if (!silent) {
            ksu.toast(t("toastConfigSaved"));
        }
        var status = document.getElementById("gadget-status");
        if (status) {
            status.className = "status-dot status-ok";
            status.textContent = "Ready";
        }
    } else if (!silent) {
        ksu.toast("⚠️ 保存遇到问题，请检查存储权限");
    }
}

// 强制从 DOM 输入控件收集目标项字段
function collectDOMTargetInputs() {
    if (!config.targets) return;
    config.targets.forEach(function (tItem, i) {
        var body = document.getElementById("target-body-" + i);
        if (!body) return;

        var delayInput = body.querySelector("input[type='number']");
        if (delayInput) tItem.start_up_delay_ms = parseInt(delayInput.value) || 0;

        var textareas = body.querySelectorAll("textarea");
        if (textareas.length > 0 && textareas[0]) {
            tItem.injected_libraries = textareas[0].value.split("\n")
                .filter(function (l) { return l.trim() !== ""; })
                .map(function (l) { return { path: l.trim() }; });
        }

        if (tItem.child_gating && textareas.length > 1 && textareas[1]) {
            tItem.child_gating.injected_libraries = textareas[1].value.split("\n")
                .filter(function (l) { return l.trim() !== ""; })
                .map(function (l) { return { path: l.trim() }; });
        }
    });
}

// ── Gadget Multi-Mode & Script Support ────────────────────────────────────────
function switchGadgetMode(mode) {
    currentGadgetMode = mode;
    ["listen", "script", "raw"].forEach(function (m) {
        var tab = document.getElementById("tab-" + m);
        var panel = document.getElementById("panel-" + m);
        if (tab) tab.className = "mode-tab" + (m === mode ? " active" : "");
        if (panel) panel.className = "mode-content" + (m === mode ? " active" : "");
    });
}

async function loadGadgetConfig() {
    var status = document.getElementById("gadget-status");
    var editor = document.getElementById("gadget-editor");
    var r = await exec("cat " + GADGET_CONFIG_PATH);
    var content = "";
    if (r.errno === 0 && r.stdout.trim().length > 0) {
        content = r.stdout;
        status.className = "status-dot status-ok";
        status.textContent = "Ready";
    } else {
        content = JSON.stringify({
            interaction: {
                type: "listen",
                address: "0.0.0.0",
                port: 27042,
                on_port_conflict: "pick-next",
                on_load: "wait"
            }
        }, null, 4);
        status.className = "status-dot status-err";
        status.textContent = "Default";
    }
    editor.value = content;

    // Parse mode and populate visual fields
    try {
        var parsed = JSON.parse(content);
        if (parsed.interaction) {
            if (parsed.interaction.type === "script") {
                switchGadgetMode("script");
                if (parsed.interaction.path) {
                    document.getElementById("script-path").value = parsed.interaction.path;
                }
            } else if (parsed.interaction.type === "listen") {
                switchGadgetMode("listen");
                if (parsed.interaction.port) {
                    document.getElementById("listen-port").value = parsed.interaction.port;
                }
                if (parsed.interaction.address) {
                    document.getElementById("listen-address").value = parsed.interaction.address;
                }
            }
        }
    } catch (_) {}

    // Load script content in background
    loadScriptFile();
}

async function loadScriptFile() {
    var scriptPath = document.getElementById("script-path").value || DEFAULT_SCRIPT_PATH;
    var scriptEditor = document.getElementById("script-editor");
    var r = await exec("cat " + scriptPath);
    if (r.errno === 0 && r.stdout.trim().length > 0) {
        scriptEditor.value = r.stdout;
    } else {
        scriptEditor.value = `// KsuFrida 离线免联网 Hook 脚本模板\nJava.perform(function () {\n    console.log("[*] KsuFrida offline script loaded successfully!");\n});\n`;
    }
}

async function saveScriptFile() {
    var scriptPath = document.getElementById("script-path").value || DEFAULT_SCRIPT_PATH;
    var content = document.getElementById("script-editor").value;
    var ok = await writeTextFile(scriptPath, content, "666");
    if (ok) {
        ksu.toast(t("toastScriptSaved"));
    } else {
        ksu.toast("⚠️ 脚本保存失败");
    }
}

function updateListenConfig() {
    var port = parseInt(document.getElementById("listen-port").value) || 27042;
    var addr = document.getElementById("listen-address").value || "0.0.0.0";
    var obj = {
        interaction: {
            type: "listen",
            address: addr,
            port: port,
            on_port_conflict: "pick-next",
            on_load: "wait"
        }
    };
    document.getElementById("gadget-editor").value = JSON.stringify(obj, null, 4);
}

function updateScriptConfig() {
    var scriptPath = document.getElementById("script-path").value || DEFAULT_SCRIPT_PATH;
    var obj = {
        interaction: {
            type: "script",
            path: scriptPath,
            on_change: "resend"
        }
    };
    document.getElementById("gadget-editor").value = JSON.stringify(obj, null, 4);
}

async function saveGadgetModeConfig() {
    if (currentGadgetMode === "listen") {
        updateListenConfig();
    } else if (currentGadgetMode === "script") {
        updateScriptConfig();
        await saveScriptFile();
    }
    await saveGadgetConfig();
}

async function saveGadgetConfig() {
    var content = document.getElementById("gadget-editor").value;
    var ok = await writeTextFile(GADGET_CONFIG_PATH, content, "644");
    if (ok) {
        ksu.toast(t("toastGadgetSaved"));
        loadGadgetConfig();
    } else {
        ksu.toast("⚠️ Gadget 配置保存失败");
    }
}

function insertScriptTemplate(type) {
    var editor = document.getElementById("script-editor");
    var tmpl = "";
    if (type === "java") {
        tmpl = `\n// Java Method Hook Template\nJava.perform(function () {\n    var Activity = Java.use("android.app.Activity");\n    Activity.onResume.implementation = function () {\n        console.log("[+] onResume called: " + this);\n        this.onResume();\n    };\n});\n`;
    } else if (type === "native") {
        tmpl = `\n// Native Function Hook Template\nvar targetFunc = Module.findExportByName(null, "open");\nif (targetFunc) {\n    Interceptor.attach(targetFunc, {\n        onEnter: function (args) {\n            console.log("[+] open: " + Memory.readUtf8String(args[0]));\n        }\n    });\n}\n`;
    }
    editor.value += tmpl;
}

// ── App Operations ───────────────────────────────────────────────────────────
async function restartApp(pkg) {
    ksu.toast(t("toastRestarting"));
    var cmd = "am force-stop " + pkg + " && monkey -p " + pkg + " -c android.intent.category.LAUNCHER 1";
    var r = await exec(cmd);
    if (r.errno === 0) {
        ksu.toast(t("toastRestarted") + pkg);
    } else {
        ksu.toast("Restart error: " + (r.stderr || "Check package"));
    }
}

async function copyAdbCommand() {
    var port = "27042";
    try {
        var content = document.getElementById("gadget-editor").value;
        var parsed = JSON.parse(content);
        if (parsed.interaction && parsed.interaction.port) {
            port = parsed.interaction.port.toString();
        }
    } catch (_) {}
    var cmd = "adb forward tcp:" + port + " tcp:" + port + " && frida -H 127.0.0.1:" + port + " -n Gadget";
    if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd);
        ksu.toast(t("toastCopiedAdb"));
    } else {
        prompt("Copy ADB Command:", cmd);
    }
}

// ── App list (Lazy, Instant & Optimized) ─────────────────────────────────────
async function fetchApps() {
    if (appsLoaded || isFetchingApps) return;
    isFetchingApps = true;

    // 毫秒级极速获取所有第三方安装包
    var r = await exec("pm list packages -3 | sed 's/package://' | sort");
    if (r.errno === 0 && r.stdout.trim().length > 0) {
        allApps = r.stdout.split("\n")
            .map(function (l) { return l.trim(); })
            .filter(function (l) { return l.length > 0; });

        allApps.forEach(function (pkg) {
            if (!appLabels[pkg]) {
                var segs = pkg.split(".");
                var last = segs[segs.length - 1] || pkg;
                if (last.toLowerCase() === "android" && segs.length > 1) {
                    last = segs[segs.length - 2];
                }
                appLabels[pkg] = last.charAt(0).toUpperCase() + last.slice(1);
            }
        });
        appsLoaded = true;
    }
    isFetchingApps = false;
    renderAppList();
}

function getAppLabel(pkg) {
    return appLabels[pkg] || pkg;
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderTargets() {
    var container = document.getElementById("targets");
    var countBadge = document.getElementById("targets-count");
    container.innerHTML = "";

    if (!config.targets) config.targets = [];
    countBadge.textContent = config.targets.length;

    if (config.targets.length === 0) {
        container.innerHTML = '<div class="empty">' + t("noTargets") + '</div>';
        return;
    }

    config.targets.forEach(function (tItem, i) {
        var div = document.createElement("div");
        div.className = "target-item" + (tItem.enabled ? "" : " disabled");

        var childHtml = "";
        if (tItem.child_gating && tItem.child_gating.enabled) {
            var childLibs = (tItem.child_gating.injected_libraries || [])
                .map(function (l) { return l.path; }).join("\n");
            childHtml =
                '<div class="field-group">' +
                    '<div class="field-label"><span>' + t("childModeLabel") + '</span></div>' +
                    '<select onchange="updateField(' + i + ',\'child_mode\',this.value)">' +
                        '<option value="freeze"' + (tItem.child_gating.mode === "freeze" ? " selected" : "") + '>' + t("modeFreeze") + '</option>' +
                        '<option value="kill"' + (tItem.child_gating.mode === "kill" ? " selected" : "") + '>' + t("modeKill") + '</option>' +
                        '<option value="inject"' + (tItem.child_gating.mode === "inject" ? " selected" : "") + '>' + t("modeInject") + '</option>' +
                    '</select>' +
                '</div>' +
                '<div class="field-group">' +
                    '<div class="field-label"><span>' + t("childLibsLabel") + '</span></div>' +
                    '<textarea onchange="updateField(' + i + ',\'child_libs\',this.value)" placeholder="/data/local/tmp/libsec/libsecmon-child.so">' + childLibs + '</textarea>' +
                '</div>';
        }

        var libs = (tItem.injected_libraries || []).map(function (l) { return l.path; }).join("\n");
        var label = getAppLabel(tItem.app_name);
        var firstChar = (label.charAt(0) || "A").toUpperCase();
        var avatarBg = getAvatarColor(tItem.app_name);

        div.innerHTML =
            '<div class="target-head" onclick="toggleCardBody(' + i + ')">' +
                '<div class="target-info">' +
                    '<div class="app-avatar" style="background:' + avatarBg + '">' + firstChar + '</div>' +
                    '<div class="app-text">' +
                        '<div class="app-name">' + label + '</div>' +
                        '<div class="app-pkg">' + tItem.app_name + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="target-actions" onclick="event.stopPropagation()">' +
                    '<button class="btn btn-warning btn-sm" onclick="restartApp(\'' + tItem.app_name + '\')">' + t("btnRestart") + '</button>' +
                    '<label class="switch" title="' + (tItem.enabled ? t("statusEnabled") : t("statusDisabled")) + '">' +
                        '<input type="checkbox"' + (tItem.enabled ? " checked" : "") + ' onchange="updateField(' + i + ',\'enabled\',this.checked)">' +
                        '<span class="slider"></span>' +
                    '</label>' +
                    '<button class="btn btn-danger btn-sm" onclick="removeTarget(' + i + ')">' + t("btnDelete") + '</button>' +
                '</div>' +
            '</div>' +
            '<div class="target-body" id="target-body-' + i + '">' +
                '<div class="field-group row-between">' +
                    '<div>' +
                        '<div class="field-label"><span>' + t("ksieLabel") + '</span></div>' +
                        '<div class="field-desc">' + t("ksieDesc") + '</div>' +
                    '</div>' +
                    '<label class="switch">' +
                        '<input type="checkbox"' + (tItem.kernel_assisted_evasion ? " checked" : "") + ' onchange="updateField(' + i + ',\'ksie\',this.checked)">' +
                        '<span class="slider"></span>' +
                    '</label>' +
                '</div>' +
                '<div class="field-group">' +
                    '<div class="field-label"><span>' + t("delayLabel") + '</span></div>' +
                    '<input type="number" min="0" step="100" value="' + (tItem.start_up_delay_ms || 0) + '" onchange="updateField(' + i + ',\'delay\',this.value)">' +
                    '<div class="field-desc">' + t("delayDesc") + '</div>' +
                '</div>' +
                '<div class="field-group">' +
                    '<div class="field-label"><span>' + t("libsLabel") + '</span></div>' +
                    '<textarea onchange="updateField(' + i + ',\'libs\',this.value)" placeholder="/data/local/tmp/libsec/libsecmon.so">' + libs + '</textarea>' +
                    '<div class="field-desc">' + t("libsDesc") + '</div>' +
                '</div>' +
                '<div class="sub-panel">' +
                    '<div class="row-between">' +
                        '<div class="field-label" style="margin-bottom:0"><span>' + t("childGatingLabel") + '</span></div>' +
                        '<label class="switch">' +
                            '<input type="checkbox"' + (tItem.child_gating && tItem.child_gating.enabled ? " checked" : "") + ' onchange="updateField(' + i + ',\'child_enabled\',this.checked)">' +
                            '<span class="slider"></span>' +
                        '</label>' +
                    '</div>' +
                    childHtml +
                '</div>' +
            '</div>';

        container.appendChild(div);
    });
}

function toggleCardBody(i) {
    var body = document.getElementById("target-body-" + i);
    if (body) {
        body.style.display = (body.style.display === "none") ? "block" : "none";
    }
}

// ── Data updates ─────────────────────────────────────────────────────────────
function updateField(i, field, value) {
    var tItem = config.targets[i];
    if (!tItem) return;

    switch (field) {
        case "enabled":
            tItem.enabled = value;
            renderTargets();
            break;
        case "ksie":
            tItem.kernel_assisted_evasion = value;
            break;
        case "delay":
            tItem.start_up_delay_ms = parseInt(value) || 0;
            break;
        case "libs":
            tItem.injected_libraries = value.split("\n")
                .filter(function (l) { return l.trim() !== ""; })
                .map(function (l) { return { path: l.trim() }; });
            break;
        case "child_enabled":
            if (!tItem.child_gating) {
                tItem.child_gating = { enabled: false, mode: "freeze", injected_libraries: [] };
            }
            tItem.child_gating.enabled = value;
            renderTargets();
            break;
        case "child_mode":
            tItem.child_gating.mode = value;
            break;
        case "child_libs":
            tItem.child_gating.injected_libraries = value.split("\n")
                .filter(function (l) { return l.trim() !== ""; })
                .map(function (l) { return { path: l.trim() }; });
            break;
    }
    // 修改任意开关或参数时后台自动保存落盘
    saveAllConfig(true);
}

function removeTarget(i) {
    config.targets.splice(i, 1);
    renderTargets();
    // 移除应用时后台自动保存落盘
    saveAllConfig(true);
}

function addTarget(pkg) {
    if (!config.targets) config.targets = [];

    // 如果当前只有一个占位用的 example 项目，添加新应用时自动清除占位项
    if (config.targets.length === 1 && config.targets[0].app_name === "com.example.package") {
        config.targets = [];
    }

    if (config.targets.some(function (tItem) { return tItem.app_name === pkg; })) {
        ksu.toast(t("toastAlreadyAdded"));
        return;
    }

    config.targets.push({
        app_name: pkg,
        enabled: true,
        kernel_assisted_evasion: false,
        start_up_delay_ms: 0,
        injected_libraries: [{ path: "/data/local/tmp/libsec/libsecmon.so" }],
        child_gating: { enabled: false, mode: "freeze", injected_libraries: [] }
    });

    renderTargets();
    // 添加应用后立即自动持久化保存到文件，杜绝用户未点击保存直接退出的数据丢失
    saveAllConfig(false);
}

// ── Modals (Lazy Loaded) ─────────────────────────────────────────────────────
function showAppList() {
    document.getElementById("app-modal").style.display = "flex";
    document.getElementById("app-search").value = "";
    if (!appsLoaded) {
        var list = document.getElementById("app-list");
        list.innerHTML = '<div style="text-align:center;padding:24px 0;"><div class="spinner"></div><div style="font-size:12px;color:var(--text-muted);">' + t("loadingApps") + '</div></div>';
        fetchApps();
    } else {
        renderAppList();
    }
}

function closeAppModal() {
    document.getElementById("app-modal").style.display = "none";
}

function showHelpModal() {
    renderHelpContent();
    document.getElementById("help-modal").style.display = "flex";
}

function closeHelpModal() {
    document.getElementById("help-modal").style.display = "none";
}

function renderAppList() {
    var list = document.getElementById("app-list");
    var search = document.getElementById("app-search").value.toLowerCase();

    var filtered = allApps.filter(function (a) {
        var label = (appLabels[a] || "").toLowerCase();
        return a.toLowerCase().indexOf(search) !== -1 || label.indexOf(search) !== -1;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty">' + t("noAppsFound") + '</div>';
        return;
    }

    list.innerHTML = "";
    filtered.forEach(function (app) {
        var row = document.createElement("div");
        row.className = "app-row";
        var label = getAppLabel(app);
        var firstChar = (label.charAt(0) || "A").toUpperCase();
        var avatarBg = getAvatarColor(app);
        row.innerHTML =
            '<div class="app-avatar" style="background:' + avatarBg + '; width:32px; height:32px; font-size:13px;">' + firstChar + '</div>' +
            '<div class="app-text" style="flex:1; min-width:0;">' +
                '<div class="app-name" style="font-size:13px;">' + label + '</div>' +
                '<div class="app-pkg">' + app + '</div>' +
            '</div>';
        row.onclick = function () {
            addTarget(app);
            closeAppModal();
        };
        list.appendChild(row);
    });
}

// ── Init (Instant Startup in < 50ms) ─────────────────────────────────────────
window.onload = function () {
    if (typeof ksu === "undefined") {
        document.body.innerHTML = '<div style="text-align:center;padding:40px;color:#f43f5e;font-size:15px;">' +
            '⚠️ 请在 KernelSU / Magisk 管理器内置 WebUI 中打开此页面。</div>';
        return;
    }

    updateStaticI18n();

    document.getElementById("btn-add").onclick = showAppList;
    document.getElementById("btn-save").onclick = saveAllConfig;
    document.getElementById("btn-reload").onclick = function () { loadConfig(); loadGadgetConfig(); };
    document.getElementById("btn-save-gadget").onclick = saveGadgetConfig;
    document.getElementById("btn-copy-adb").onclick = copyAdbCommand;
    document.getElementById("btn-close-modal").onclick = closeAppModal;
    document.getElementById("btn-lang-toggle").onclick = toggleLanguage;
    document.getElementById("btn-help").onclick = showHelpModal;
    document.getElementById("btn-close-help").onclick = closeHelpModal;
    document.getElementById("app-search").oninput = renderAppList;

    // Click outside to close modals
    window.onclick = function (event) {
        const appModal = document.getElementById("app-modal");
        const helpModal = document.getElementById("help-modal");
        if (event.target === appModal) closeAppModal();
        if (event.target === helpModal) closeHelpModal();
    };

    // Fast Startup: Load configurations instantly
    loadConfig();
    loadGadgetConfig();
};

