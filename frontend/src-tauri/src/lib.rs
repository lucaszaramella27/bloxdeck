use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StartupContext {
    force_setup: bool,
    install_dir: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallOptions {
    create_desktop_shortcut: bool,
    create_start_menu_shortcut: bool,
    launch_after_install: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallResult {
    install_dir: String,
    executable_path: String,
    desktop_shortcut_path: Option<String>,
    start_menu_shortcut_path: Option<String>,
}

#[tauri::command]
fn startup_context() -> StartupContext {
    let force_setup_env = std::env::var("BLOXDECK_FORCE_SETUP")
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"))
        .unwrap_or(false);

    let force_setup_exe = std::env::current_exe()
        .ok()
        .and_then(|path| path.file_stem().map(|stem| stem.to_string_lossy().to_lowercase()))
        .map(|name| name.contains("setup"))
        .unwrap_or(false);

    StartupContext {
        force_setup: force_setup_env || force_setup_exe,
        install_dir: default_install_dir().to_string_lossy().to_string(),
    }
}

fn default_install_dir() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("Programs")
        .join("BloxDeck")
}

fn desktop_shortcut_path() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|path| path.join("Desktop").join("BloxDeck.lnk"))
}

fn start_menu_shortcut_path() -> Option<PathBuf> {
    std::env::var_os("APPDATA").map(PathBuf::from).map(|path| {
        path.join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("BloxDeck.lnk")
    })
}

fn powershell_string(value: &Path) -> String {
    format!("'{}'", value.to_string_lossy().replace('\'', "''"))
}

fn create_windows_shortcut(shortcut_path: &Path, target_path: &Path, working_dir: &Path) -> Result<(), String> {
    if let Some(parent) = shortcut_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let icon_location = format!("{},0", target_path.to_string_lossy());
    let script = format!(
        "$ErrorActionPreference = 'Stop'; \
         $WshShell = New-Object -ComObject WScript.Shell; \
         $Shortcut = $WshShell.CreateShortcut({shortcut_path}); \
         $Shortcut.TargetPath = {target_path}; \
         $Shortcut.WorkingDirectory = {working_dir}; \
         $Shortcut.IconLocation = '{icon_location}'; \
         $Shortcut.Save();",
        shortcut_path = powershell_string(shortcut_path),
        target_path = powershell_string(target_path),
        working_dir = powershell_string(working_dir),
        icon_location = icon_location.replace('\'', "''"),
    );

    let status = Command::new("powershell.exe")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .status()
        .map_err(|error| error.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Falha ao criar atalho: {status}"))
    }
}

#[tauri::command]
fn install_bloxdeck(options: InstallOptions) -> Result<InstallResult, String> {
    let source_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let install_dir = default_install_dir();
    let executable_path = install_dir.join("BloxDeck.exe");

    fs::create_dir_all(&install_dir).map_err(|error| error.to_string())?;

    if source_exe != executable_path {
        fs::copy(&source_exe, &executable_path).map_err(|error| {
            format!(
                "Nao consegui copiar o app. Fecha o BloxDeck se ele estiver aberto e tenta de novo. Detalhe: {error}"
            )
        })?;
    }

    let desktop_shortcut_path = if options.create_desktop_shortcut {
        let shortcut_path = desktop_shortcut_path().ok_or_else(|| "Nao encontrei a pasta Desktop.".to_string())?;
        create_windows_shortcut(&shortcut_path, &executable_path, &install_dir)?;
        Some(shortcut_path)
    } else {
        None
    };

    let start_menu_shortcut_path = if options.create_start_menu_shortcut {
        let shortcut_path =
            start_menu_shortcut_path().ok_or_else(|| "Nao encontrei a pasta do Menu Iniciar.".to_string())?;
        create_windows_shortcut(&shortcut_path, &executable_path, &install_dir)?;
        Some(shortcut_path)
    } else {
        None
    };

    if options.launch_after_install {
        Command::new(&executable_path)
            .spawn()
            .map_err(|error| format!("Instalei, mas nao consegui abrir o BloxDeck: {error}"))?;
    }

    Ok(InstallResult {
        install_dir: install_dir.to_string_lossy().to_string(),
        executable_path: executable_path.to_string_lossy().to_string(),
        desktop_shortcut_path: desktop_shortcut_path.map(|path| path.to_string_lossy().to_string()),
        start_menu_shortcut_path: start_menu_shortcut_path.map(|path| path.to_string_lossy().to_string()),
    })
}

#[tauri::command]
fn set_compact_mode(window: tauri::WebviewWindow, compact: bool) -> Result<(), String> {
    if compact {
        window
            .set_min_size(Some(tauri::LogicalSize::new(380.0, 580.0)))
            .map_err(|error| error.to_string())?;
        window
            .set_size(tauri::LogicalSize::new(420.0, 720.0))
            .map_err(|error| error.to_string())?;
        window
            .set_always_on_top(true)
            .map_err(|error| error.to_string())?;
    } else {
        window
            .set_always_on_top(false)
            .map_err(|error| error.to_string())?;
        window
            .set_min_size(Some(tauri::LogicalSize::new(1080.0, 700.0)))
            .map_err(|error| error.to_string())?;
        window
            .set_size(tauri::LogicalSize::new(1280.0, 820.0))
            .map_err(|error| error.to_string())?;
    }

    window.center().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_action(window: tauri::WebviewWindow, action: String) -> Result<(), String> {
    match action.as_str() {
        "minimize" => window.minimize().map_err(|error| error.to_string()),
        "toggle_maximize" => {
            let is_maximized = window.is_maximized().map_err(|error| error.to_string())?;
            if is_maximized {
                window.unmaximize().map_err(|error| error.to_string())
            } else {
                window.maximize().map_err(|error| error.to_string())
            }
        }
        "close" => window.close().map_err(|error| error.to_string()),
        "start_dragging" => window.start_dragging().map_err(|error| error.to_string()),
        _ => Err(format!("Acao de janela desconhecida: {action}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            install_bloxdeck,
            set_compact_mode,
            startup_context,
            window_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running BloxDeck");
}
