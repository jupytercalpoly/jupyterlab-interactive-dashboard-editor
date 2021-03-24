# jupyterlab-interactive-dashboard-editor

![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/workflows/Build/badge.svg)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-interactive-dashboard-editor/master?urlpath=lab)
[![npm version](https://badge.fury.io/js/jupyterlab-interactive-dashboard-editor.svg)](https://www.npmjs.com/package/jupyterlab-interactive-dashboard-editor)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab-interactive-dashboard-editor/badge/?version=latest)](https://jupyterlab-interactive-dashboard-editor.readthedocs.io/en/latest/?badge=latest)

Interactively create and customize dashboards in JupyterLab

![presto-overview](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/overview.gif)

## Additional Gifs

<details>
  <summary>Click to expand</summary>
  Add and rearrange outputs on dashboards right from your notebook.

![add-move-resize](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/add_move_resize.gif)

Add outputs from multiple notebooks.

![add-multiple](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/multiple_notebooks.gif)

See changes immediately.

![see-changes](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/update_cells.gif)

Preview your dashboard and interact with widgets in present mode.

![present-mode](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/present_edit.gif)

Undo and redo.

![undo-redo](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/undo_redo.gif)

Add markdown too.

![markdown-too](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/markdown_too.gif)

Save dashboards to file,

![save-dashboard](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/save.gif)

Load them up,

![load-dashboard](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/load.gif)

And edit them again!

![edit-again](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/blob/master/Design/gifs/edit_again.gif)

</details>

## Requirements

- JupyterLab >= 2.0

## Install

For JupyterLab 3+:

```bash
pip install jupyterlab-interactive-dashboard-editor
```

For JupyterLab 2.x:

```bash
jupyter labextension install jupyterlab-interactive-dashboard-editor
jupyter lab build
```

Note: You will need NodeJS to install the extension for JupterLab 2.x.

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab-interactive-dashboard-editor directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Uninstall

For JupyterLab 3+:

```bash
pip uninstall -interactive-dashboard-editor
```

For JupyterLab 2.x:

```bash
jupyter labextension uninstall jupyterlab-interactive-dashboard-editor
```
