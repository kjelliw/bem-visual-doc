# BEM Visual Documentation

Generates a static HTML page with visual representations of all classes in the supplied CSS file, ordered in a BEM structure.

It's expected that the CSS file uses default BEM naming conventions, everything else will be treated as a "block".

Adds some embedded CSS/Javascript for basic filtering/search functionality and visual structure.


## Usage

* Install package

    > npm install "https://github.com/kjelliw/bem-visual-doc.git#branch" --save

    * _Note that #branch is not needed if using the main branch._

* Add command to package.json scripts section, for example:

    > "bem-doc": "node ./node_modules/bem-visual-doc/generate-docs.js wwwroot/dist/main.css"

