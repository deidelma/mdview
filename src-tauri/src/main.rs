#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod md;

fn main() {
    app::run();
}
