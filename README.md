# One Tag

This is a extension used of C/C++ symbol searching, which is based on ctags and gtags.

## Features

Following command is available in this extension for symbol searching:

|Command                        |Desc      |
|-------------------------------|----------|
|ONE-TAG: Find Project Symbols  | Search the symbol(function, struct, etc) in the whole project |
|ONE-TAG: Find current file Symbols | Search the symbol(function, struct, etc) in current file |
|ONE-TAG: Goto Symbol           | Jump to the definition of the symbol |
|ONE-TAG: Find Function References | Find all the usage of current symbol |
|ONE-TAG: Update all tags       | Update/create the tags file for the whole project |

## Requirements

ctags and gtags is required tp be installed.

For ubuntu, please install them with the following command:

```shell
sudo apt install global universal-ctags -y
```

For centos, please compile and install them manually with following command:

```shell
yum install libtool-ltdl-devel

wget https://github.com/universal-ctags/ctags/releases/download/v6.0.0/universal-ctags-6.0.0.tar.gz
tar -xf universal-ctags-6.0.0.tar.gz
cd universal-ctags-6.0.0
./configure
make install

cd ../
wget https://ftp.gnu.org/pub/gnu/global/global-6.6.10.tar.gz
tar -xf global-6.6.10.tar.gz
cd global-6.6.10
./configure
make install
```

## Setup

Press F1 and run the command `ONE-TAG: Update all tags` to generate the tag files.

## Extension Settings

* `One-tag: Auto Update`: Whether One-Tag should update automatically when saving file. (default: true)


## Release Notes

### 1.0.0

Initial release of One Tag

