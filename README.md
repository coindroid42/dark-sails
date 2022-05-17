in package.json

add in dependency section of package.json

```
{
      "dependencies": {
        "patch-package": "^6.4.7",
        "dark-sails": "^1.0.0",
      }
}

```

add in script section of package.json

```
{
  "scripts": {
    "postinstall": "patch-package --patch-dir=node_modules/dark-sails"
    }
}
```
