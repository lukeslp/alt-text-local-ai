"""Run a simple check using the Installer class."""

import pathlib
import subprocess

base = pathlib.Path(__file__).resolve().parents[1]
installer_js = base / "scripts" / "installer.js"

code = (
    f"const Installer=require('{installer_js.as_posix()}');"
    "const i=new Installer();"
    "i.checkOllamaInstallation().then(r=>{{console.log(r);}}).catch(e=>{{console.error(e);process.exit(1);}});"
)

subprocess.run(["node", "-e", code], check=True)
