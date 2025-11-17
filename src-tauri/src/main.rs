#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod md;
mod state;

fn main() {
    app::run();
}
