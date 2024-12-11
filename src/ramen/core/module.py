from ramen.core.graph import Graph

class Module:
    submodules: dict[str, "Module"]
    graphs: dict[str, Graph]
    