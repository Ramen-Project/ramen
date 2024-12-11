import ast

code = """
class Test:
    pass

def hello():
    print('asd')
"""

ast_tree = ast.parse(code)

print(ast.dump(ast_tree, include_attributes=True, indent=2))

code_obj = compile(ast_tree, '<string>', 'exec')

_locals = {**locals()}
_globals = {**globals()}

exec(code_obj, _globals, _locals)

print(_globals)
print(_locals)