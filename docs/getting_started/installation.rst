.. _installation:

Installation
------------

Requirements
~~~~~~~~~~~~
JupyterLab >= 2.0

Install
~~~~~~~
For JupyterLab 3+:

.. code:: bash

    pip install jupyterlab-interactive-dashboard-editor

For JupyterLab 2.x:

.. code:: bash

    jupyter labextension install jupyterlab-interactive-dashboard-editor
    jupyter lab build

Note: You will need NodeJS to install the extension for JupyterLab 2.x.

Developement install:

.. code:: bash

    # Clone the repo to your local environment
    # Move to jupyterlab-interactive-dashboard-editor directory

    # Clone the repo to your local environment
    # Change directory to the jupyterlab-interactive-dashboard-editor directory
    # Install package in development mode
    pip install -e .
    # Link your development version of the extension with JupyterLab
    jupyter labextension develop . --overwrite
    # Rebuild extension Typescript source after making changes
    jlpm run build


You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

.. code:: bash

    # Watch the source directory in one terminal, automatically rebuilding when needed
    jlpm run watch
    # Run JupyterLab in another terminal
    jupyter lab

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

.. code:: bash
    jupyter lab build --minimize=False


Uninstall
~~~~~~~~~

For JupyterLab 3+:

.. code:: bash
    pip uninstall jupyterlab-interactive-dashboard-editor

For JupyterLab 2.x:

.. code:: bash
    jupyter labextension uninstall jupyterlab-interactive-dashboard-editor
