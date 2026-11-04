#!/usr/bin/env python3
"""Genera CDMX-Roleplay.rbxlx a partir de default.project.json, sin necesidad de Rojo.

Uso:  python3 tools/build_place.py [salida.rbxlx]

Sigue las mismas reglas que Rojo:
  * carpeta con init.server.luau -> Script con hijos
  * carpeta con init.client.luau -> LocalScript con hijos
  * carpeta con init.luau        -> ModuleScript con hijos
  * carpeta sin init             -> Folder
  * X.server.luau / X.client.luau / X.luau -> Script / LocalScript / ModuleScript
"""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
_ref = 0


def ref():
    global _ref
    _ref += 1
    return "RBX%08X" % _ref


def cdata(text):
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def prop_xml(name, value):
    if isinstance(value, bool):
        return '<bool name="%s">%s</bool>' % (name, "true" if value else "false")
    if isinstance(value, (int, float)):
        return '<float name="%s">%s</float>' % (name, value)
    return '<string name="%s">%s</string>' % (name, escape(str(value)))


def item(cls, name, props=None, children=(), source=None):
    out = ['<Item class="%s" referent="%s"><Properties>' % (cls, ref())]
    out.append(prop_xml("Name", name))
    for k, v in (props or {}).items():
        out.append(prop_xml(k, v))
    if source is not None:
        out.append('<ProtectedString name="Source">%s</ProtectedString>' % cdata(source))
    out.append("</Properties>")
    out.extend(children)
    out.append("</Item>")
    return "".join(out)


def script_class(filename):
    if filename.endswith(".server.luau"):
        return "Script", filename[: -len(".server.luau")]
    if filename.endswith(".client.luau"):
        return "LocalScript", filename[: -len(".client.luau")]
    return "ModuleScript", filename[: -len(".luau")]


def from_path(path, name):
    path = ROOT / path if not isinstance(path, Path) else path
    if path.is_file():
        cls, _ = script_class(path.name)
        return item(cls, name, source=path.read_text(encoding="utf-8"))
    init = None
    for candidate in ("init.server.luau", "init.client.luau", "init.luau"):
        if (path / candidate).exists():
            init = path / candidate
            break
    children = []
    for child in sorted(path.iterdir()):
        if child == init:
            continue
        if child.is_dir():
            children.append(from_path(child, child.name))
        elif child.suffix == ".luau":
            children.append(from_path(child, script_class(child.name)[1]))
    if init:
        cls, _ = script_class(init.name)
        return item(cls, name, children=children, source=init.read_text(encoding="utf-8"))
    return item("Folder", name, children=children)


# Servicios e instancias especiales cuya clase coincide con su nombre (igual que Rojo)
SERVICES = {
    "Workspace", "Lighting", "ReplicatedStorage", "ReplicatedFirst", "ServerScriptService",
    "ServerStorage", "StarterGui", "StarterPack", "StarterPlayer", "StarterPlayerScripts",
    "StarterCharacterScripts", "Teams", "SoundService", "Chat", "TextChatService",
}


def from_node(name, node):
    if "$path" in node:
        return from_path(Path(ROOT / node["$path"]), name)
    cls = node.get("$className") or (name if name in SERVICES else "Folder")
    children = [from_node(k, v) for k, v in node.items() if not k.startswith("$")]
    return item(cls, name, node.get("$properties"), children)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "CDMX-Roleplay.rbxlx"
    project = json.loads((ROOT / "default.project.json").read_text(encoding="utf-8"))
    tree = project["tree"]
    services = [from_node(k, v) for k, v in tree.items() if not k.startswith("$")]
    if "Workspace" not in tree:
        services.insert(0, item("Workspace", "Workspace"))
    xml = (
        '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'
        + "".join(services)
        + "</roblox>\n"
    )
    out.write_text(xml, encoding="utf-8")
    print("Lugar generado:", out)


if __name__ == "__main__":
    main()
