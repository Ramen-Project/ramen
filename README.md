# Ramen

## Features

* Graphical programming
    * support generics
* Virtual environment for each workspace/project
* Headless graph execution
* You can write your own library

## Installation
### Quickstart

```sh
# For basic packages
pip install ramen
```

**Install all supported plugins**
```sh
pip install ramen[all]
```

### Build it yourself

**Requirements**
* [Bun](https://bun.sh/) - Best NPM
* [uv](https://docs.astral.sh/uv/) - Python package manager
* [justfile](https://github.com/casey/just) - Justfile

```sh
$ git clone https://github.com/Pr0gCat/Ramen.git
$ cd Ramen
$ uv run just build
```

## Gloassary

* **Toppings** - Extensions of Ramen

## Development

> Bruh: you must have `artifacts` folder in order to do `uv sync`.