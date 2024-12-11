from collections import namedtuple
from ramen.core.module import Module

Dependency = namedtuple("Dependency", ["name", "semver"])

class Package:
    root_module: Module
    dependencies: list[Dependency]