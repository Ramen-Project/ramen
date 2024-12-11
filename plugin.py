
from importlib.metadata import entry_points

for plugin in entry_points(group='ramen.toppings'):
    print(plugin)
    plugin.load()

