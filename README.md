# Presto - Jupyterlab Interactive Dashboard Editor

![Github Actions Status](https://github.com/jupytercalpoly/jupyterlab-interactive-dashboard-editor/workflows/Build/badge.svg)

Interactively create and customize dashboards in JupyterLab, right next to your notebooks.

Add and rearrange outputs on dashboards right from your notebook.

![add-move-resize](https://gfycat.com/babyishpartialflatfish.gif)

Add outputs from multiple notebooks.

![add-multiple](https://gfycat.com/negligibleobviousgrunion.gif)

See changes immediately.

![see-changes](https://gfycat.com/metallicyellowfirebelliedtoad.gif)

Preview your dashboard and interact with widgets in present mode.

![present-mode](https://gfycat.com/incompleteorganicbonobo.gif)

Undo and redo.

![undo-redo](https://gfycat.com/hopefulidolizedelver.gif)

Add markdown too.

![markdown-too](https://gfycat.com/animatedbothblackwidowspider.gif)

Save dashboards to file,

![save-dashboard](https://gfycat.com/blackandwhiteperfectekaltadeta.gif)

Load them up,

![load-dashboard](https://gfycat.com/insecuretalkativebanteng.gif)

And edit them again!

![edit-again](https://gfycat.com/marvelousfemininehyrax.gif)


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
