## Cocos 3D Engine

Cocos 3d engine is specially designed for game scenario.

## Install

Clone the repo and run in the directory:

```bash
npm install
```

**NOTE**

If you're having trouble installing electron, try to use a Chinese mirror for it. To achieve this, just comment out electron field in dependencies section in package.json, then run:

```bash
npm install
```

After that, restore the electron field and run the command below:

```bash
cnpm install electron
```
## Run tests
There are two categories of tests in game repo, located at path `examples/playground` and `examples/tests-3d`, playground includes some handwritten tests, however, tests-3d requires a bundle of resources from unity exporter tools, the resources will be created by game editor in future.

All the assets required to run tests is in this [repo](https://github.com/cocos-creator/assets-3d). All you need to do is to copy the assets to `examples/assets` directory.

To run tests, run `npm start`, it will start an server and open the game tests with your default browser.

An alternative way to run tests is to run `npm run server`, it will display the url in the console, it is your choice to visit the url with your favorite browser.

## Development
The coding style of our game is [airbnb/javascript](https://github.com/airbnb/javascript), though the current style is not uniform, we are migrating to this standard.

To build the project, please run:

```bash
npm run build
```

If you change the code frequently, you can just start a dev process:

```bash
npm run dev
```

The process will watch your files, and build the project when they changes.

## Documentation

TODO

## License

MIT.
Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

