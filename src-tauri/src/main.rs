#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;

mod app;
mod commands;
mod history;
mod md;
mod menu;
mod state;

/// A lightweight cross-platform Markdown viewer
#[derive(Parser, Debug)]
#[command(name = "mdview")]
#[command(version, about, long_about = None)]
struct Args {
    /// Path to the Markdown file to open
    #[arg(value_name = "FILE")]
    file: Option<String>,
}

fn main() {
    let args = Args::parse();
    app::run(args.file);
}
