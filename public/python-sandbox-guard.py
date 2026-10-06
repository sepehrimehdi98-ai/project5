import ast
import builtins

_NOVA_ALLOWED_AST = {
    ast.Module, ast.Expr, ast.Assign, ast.AugAssign, ast.Name, ast.Load, ast.Store,
    ast.Constant, ast.Call, ast.BinOp, ast.UnaryOp, ast.Compare, ast.BoolOp,
    ast.If, ast.For, ast.While, ast.Break, ast.Continue, ast.Pass, ast.List,
    ast.Tuple, ast.Dict, ast.Subscript, ast.Slice, ast.JoinedStr, ast.FormattedValue,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow, ast.UAdd,
    ast.USub, ast.Not, ast.And, ast.Or, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt,
    ast.GtE, ast.In, ast.NotIn, ast.Is, ast.IsNot,
}
_NOVA_SAFE_CALLS = {
    "print", "range", "len", "str", "int", "float", "bool", "list", "tuple",
    "dict", "sum", "min", "max", "abs", "round", "enumerate", "zip", "sorted",
    "reversed",
}


def nova_run(source):
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if type(node) not in _NOVA_ALLOWED_AST:
            raise ValueError("این محیط فقط متغیرها، عبارت‌ها، شرط‌ها، حلقه‌ها، فهرست‌ها و print را اجرا می‌کند.")
        if isinstance(node, ast.Name) and node.id.startswith("__"):
            raise ValueError("نام‌های ویژه پایتون در این محیط مجاز نیستند.")
        if isinstance(node, ast.Call) and (not isinstance(node.func, ast.Name) or node.func.id not in _NOVA_SAFE_CALLS):
            raise ValueError("این تابع در محیط آموزشی مجاز نیست.")
    scope = {"__builtins__": {name: getattr(builtins, name) for name in _NOVA_SAFE_CALLS}}
    exec(compile(tree, "<nova-lesson>", "exec"), scope, scope)
