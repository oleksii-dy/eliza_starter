// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};
use keyring::Entry;
use url::Url;

// Store the server process so we can kill it when the app closes
static SERVER_PROCESS: once_cell::sync::Lazy<Arc<Mutex<Option<Child>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

#[derive(Serialize, Deserialize)]
struct OAuthCallbackData {
    code: String,
    state: String,
}

const AUTH_SESSION_KEY: &str = "elizaos_auth_session";
const AUTH_SERVICE_NAME: &str = "com.elizaos.app";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Store authentication session securely using system keychain
#[tauri::command]
async fn store_auth_session(session: String) -> Result<(), String> {
    let entry = Entry::new(AUTH_SERVICE_NAME, AUTH_SESSION_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.set_password(&session)
        .map_err(|e| format!("Failed to store session: {}", e))?;
    
    Ok(())
}

/// Retrieve authentication session from system keychain
#[tauri::command]
async fn get_auth_session() -> Result<Option<String>, String> {
    let entry = Entry::new(AUTH_SERVICE_NAME, AUTH_SESSION_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve session: {}", e)),
    }
}

/// Clear authentication session from system keychain
#[tauri::command]
async fn clear_auth_session() -> Result<(), String> {
    let entry = Entry::new(AUTH_SERVICE_NAME, AUTH_SESSION_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already cleared
        Err(e) => Err(format!("Failed to clear session: {}", e)),
    }
}

/// Handle OAuth callback from deep link
#[tauri::command]
async fn handle_oauth_callback(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let parsed_url = Url::parse(&url)
        .map_err(|e| format!("Invalid OAuth callback URL: {}", e))?;
    
    // Extract code and state from query parameters
    let query_pairs: std::collections::HashMap<String, String> = parsed_url
        .query_pairs()
        .into_owned()
        .collect();
    
    let code = query_pairs.get("code")
        .ok_or("Missing authorization code in callback URL")?;
    let state = query_pairs.get("state")
        .ok_or("Missing state parameter in callback URL")?;
    
    let callback_data = OAuthCallbackData {
        code: code.clone(),
        state: state.clone(),
    };
    
    // Emit event to frontend
    app.emit("oauth-callback", &callback_data)
        .map_err(|e| format!("Failed to emit OAuth callback event: {}", e))?;
    
    Ok(())
}

// Check if the server is running by attempting to connect to the port
fn is_server_running() -> bool {
    match TcpStream::connect("127.0.0.1:3000") {
        Ok(_) => true,
        Err(_) => false,
    }
}

// Shutdown server when app exits
fn shutdown_server() {
    println!("Shutting down Eliza server...");
    let mut guard = SERVER_PROCESS.lock().unwrap();
    if let Some(ref mut child) = *guard {
        if let Err(e) = child.kill() {
            eprintln!("Failed to kill Eliza server: {}", e);
        } else {
            println!("Eliza server shut down successfully");
        }
    }
    *guard = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Register cleanup for when app exits
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            store_auth_session,
            get_auth_session,
            clear_auth_session,
            handle_oauth_callback
        ])
        .setup(|app| {
            // Start the server if it's not already running
            if !is_server_running() {
                println!("Starting Eliza server...");
                match Command::new("elizaos")
                    .arg("start")
                    .spawn() {
                        Ok(child) => {
                            // Store the process so we can kill it when the app closes
                            let mut server_guard = SERVER_PROCESS.lock().unwrap();
                            *server_guard = Some(child);
                            println!("Eliza server process started");
                        },
                        Err(e) => {
                            eprintln!("Failed to start Eliza server: {}", e);
                        }
                    };
            } else {
                println!("Eliza server is already running");
            }
            
            // Add event listener for app exit
            let app_handle = app.handle();
            
            #[cfg(desktop)]
            {
                if let Some(main_window) = app.get_webview_window("main") {
                    main_window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { .. } = event {
                            shutdown_server();
                        }
                    });
                }
            }
            
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
        
    app.run(|_app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            shutdown_server();
        }
    });
}
