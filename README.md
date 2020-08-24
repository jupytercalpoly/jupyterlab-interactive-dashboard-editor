# jupyterlab-interactive-dashboard-editor

![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/workflows/Build/badge.svg)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupytercalpoly/jupyterlab-interactive-dashboard-editor/master?urlpath=lab)
[![Latest npm version](https://img.shields.io/npm/v/jupyterlab-interactive-dashboard?logo=npm)](https://www.npmjs.com/package/jupyterlab-interactive-dashboard-editor)
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

* JupyterLab >= 2.0

## Install

Note: You will need NodeJS to install the extension.

```bash
pip install jupyterlab_interactive_dashboard_editor
jupyter lab build
```

### Install

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Move to jupyterlab-interactive-dashboard-editor directory

# Install dependencies
jlpm
# Build Typescript source
jlpm build
# Link your development version of the extension with JupyterLab
jupyter labextension install .
# Rebuild Typescript source after making changes
jlpm build
# Rebuild JupyterLab after making any changes
jupyter lab build
```

You can watch the source directory and run JupyterLab in watch mode to watch for changes in the extension's source and automatically rebuild the extension and application.

```bash
# Watch the source directory in another terminal tab
jlpm watch
# Run jupyterlab in watch mode in one terminal tab
jupyter lab --watch
```

Now every change will be built locally and bundled into JupyterLab. Be sure to refresh your browser page after saving file changes to reload the extension (note: you'll need to wait for webpack to finish, which can take 10s+ at times).

### Uninstall

```bash
jupyter labextension uninstall jupyterlab-interactive-dashboard-editor
```
