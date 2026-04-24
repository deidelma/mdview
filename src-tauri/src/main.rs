#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;

mod app;
mod commands;
mod history;
mod launch;
mod md;
mod menu;
mod state;

/// A lightweight cross-platform Markdown viewer
#[derive(Parser, Debug)]
#[command(name = "mdview")]
#[command(version, about, long_about = None)]
struct Args {
    /// Path(s) to Markdown files to open
    #[arg(value_name = "FILE")]
    files: Vec<String>,
}

fn main() {
    let args = Args::parse();
    app::run(launch::select_initial_file(&args.files));
}
