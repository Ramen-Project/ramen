# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "click",
#     "rich",
#     "yaspin",
# ]
# ///

import subprocess
import shutil
from yaspin import yaspin
import click

def CMD(command: str):
    subprocess.run(command, shell=True).check_returncode()

@click.group()
def cli():
    pass

@cli.command()
def build():
    build_web()

@cli.command()
def build_package():
    CMD("uv build --all-packages")

@cli.command()
def build_web():
    with yaspin(text='Install Dependencies'):
        CMD("bun install --cwd src/web")
    with yaspin(text='Building frontend page'):
        CMD("bun run --cwd src/web build")
    shutil.copytree('src/web/dist', 'src/ramen/statics', dirs_exist_ok=True)

@cli.command()
def web_dev():
    CMD("bun run --cwd src/web dev")

@cli.command()
def clean():
    shutil.rmtree('dist')
    shutil.rmtree('src/web/dist')
    shutil.rmtree('src/ramen/statics')

if __name__ == "__main__":
    cli()
