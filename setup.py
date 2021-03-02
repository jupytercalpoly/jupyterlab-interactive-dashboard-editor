"""
jupyterlab-interactive-dashboard-editor setup
"""
import sys
import json
import os

from jupyter_packaging import (
    create_cmdclass, install_npm, ensure_targets,
    combine_commands, skip_if_exists
)

try:
    import jupyter_core.paths as jupyter_core_paths
except:
    jupyter_core_paths = None

import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "jupyterlab-interactive-dashboard-editor"
module = "jupyterlab_interactive_dashboard_editor"
labext_name = "jupyterlab-interactive-dashboard-editor"

# Get our version
with open(os.path.join(HERE, 'package.json')) as f:
    version = json.load(f)['version']

lab_path = os.path.join(HERE, module, "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(lab_path, "package.json"),
]

package_data_spec = {
    module: [
        "labextension/*"
    ]
}


data_files_spec = [
    ("share/jupyter/labextensions/%s" % labext_name, lab_path, "**")
]


cmdclass = create_cmdclass("js",
    package_data_spec=package_data_spec,
    data_files_spec=data_files_spec
)

cmdclass['js'] = combine_commands(
    install_npm(
        path=HERE,
        npm=["jlpm"],
        build_cmd="build:labextension",
        build_dir=os.path.join(HERE, 'dist'),
        source_dir=os.path.join(HERE, 'src')
    ),
    ensure_targets(jstargets),
)

base_develop_cmd = cmdclass["develop"]

class DevelopCmd(base_develop_cmd):
    prefix_targets = [
        ("nbconvert/templates", 'presto'),
        ("voila/templates", 'presto')
    ]

    def run(self):
        target_dir = os.path.join(sys.prefix, "share", "jupyter")
        if "--user" in sys.prefix:
            target_dir = jupyter_core_paths.user_dir()
        target_dir = os.path.join(target_dir)

        for prefix_target, name in self.prefix_targets:
            source = os.path.join("share", "jupyter", prefix_target, name)
            target = os.path.join(target_dir, prefix_target, name)
            target_subdir = os.path.dirname(target)
            if not os.path.exists(target_subdir):
                os.makedirs(target_subdir)
            rel_source = os.path.relpath(os.path.abspath(source), os.path.abspath(target_subdir))
            try:
                os.remove(target)
            except:
                pass
            print(rel_source, "->", target)
            os.symlink(rel_source, target)

        super(DevelopCmd, self).run()

cmdclass['develop'] = DevelopCmd if jupyter_core_paths else base_develop_cmd

with open("README.md", "r") as fh:
    long_description = fh.read()

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor.git",
    author="jupytercalpoly",
    description="Interactively create and customize dashboards in JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    install_requires=[
        "jupyterlab>=3.0.0rc13,==3.*",
    ],
    zip_safe=False,
    include_package_data=True,
    python_requires=">=3.6",
    license="BSD-3-Clause",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "JupyterLab3"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Framework :: Jupyter",
    ],
)

if __name__ == "__main__":
    setuptools.setup(**setup_args)
