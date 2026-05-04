use std::env;
use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{self, Command};

const APP_NAME: &str = "mdview.app";
const APP_BINARY_RELATIVE_PATH: &[&str] = &["Contents", "MacOS", "mdview"];

fn normalize_launch_arg(arg: OsString) -> OsString {
    let path = Path::new(&arg);

    if path.extension().is_none() {
        let mut normalized = arg;
        normalized.push(".md");
        normalized
    } else {
        arg
    }
}

fn app_binary_candidates(wrapper_path: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(wrapper_dir) = wrapper_path.parent() {
        candidates.push(
            wrapper_dir
                .join("bundle")
                .join("macos")
                .join(APP_NAME)
                .join(PathBuf::from_iter(APP_BINARY_RELATIVE_PATH.iter().copied())),
        );

        candidates.push(
            wrapper_dir
                .join(APP_NAME)
                .join(PathBuf::from_iter(APP_BINARY_RELATIVE_PATH.iter().copied())),
        );

        if let Some(parent) = wrapper_dir.parent() {
            candidates.push(
                parent
                    .join(APP_NAME)
                    .join(PathBuf::from_iter(APP_BINARY_RELATIVE_PATH.iter().copied())),
            );
        }
    }

    candidates.push(
        Path::new("/Applications")
            .join(APP_NAME)
            .join(PathBuf::from_iter(APP_BINARY_RELATIVE_PATH.iter().copied())),
    );

    candidates
}

fn resolve_app_binary(wrapper_path: &Path) -> io::Result<PathBuf> {
    app_binary_candidates(wrapper_path)
        .into_iter()
        .find(|candidate| candidate.is_file())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                format!(
                    "Could not find {}. Expected it next to the wrapper, in bundle/macos, or in /Applications.",
                    APP_NAME
                ),
            )
        })
}

fn run() -> io::Result<()> {
    let wrapper_path = env::current_exe()?;
    let app_binary = resolve_app_binary(&wrapper_path)?;
    let normalized_args: Vec<OsString> = env::args_os().skip(1).map(normalize_launch_arg).collect();

    let status = Command::new(&app_binary).args(&normalized_args).status()?;
    match status.code() {
        Some(code) => process::exit(code),
        None => process::exit(1),
    }
}

fn main() {
    if let Err(error) = run() {
        eprintln!("mdview-open: {}", error);
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_launch_arg_appends_md_to_suffixless_target() {
        assert_eq!(
            normalize_launch_arg(OsString::from("hello")),
            OsString::from("hello.md")
        );
        assert_eq!(
            normalize_launch_arg(OsString::from("notes/today")),
            OsString::from("notes/today.md")
        );
    }

    #[test]
    fn normalize_launch_arg_preserves_existing_suffix() {
        assert_eq!(
            normalize_launch_arg(OsString::from("hello.md")),
            OsString::from("hello.md")
        );
        assert_eq!(
            normalize_launch_arg(OsString::from("hello.txt")),
            OsString::from("hello.txt")
        );
    }

    #[test]
    fn app_binary_candidates_include_bundle_and_app_siblings() {
        let wrapper = Path::new("/tmp/mdview-open");
        let candidates = app_binary_candidates(wrapper);

        assert_eq!(
            candidates[0],
            Path::new("/tmp/bundle/macos/mdview.app/Contents/MacOS/mdview")
        );
        assert_eq!(
            candidates[1],
            Path::new("/tmp/mdview.app/Contents/MacOS/mdview")
        );
        assert!(candidates.contains(&PathBuf::from(
            "/Applications/mdview.app/Contents/MacOS/mdview"
        )));
    }
}
