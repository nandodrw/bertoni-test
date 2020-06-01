# Technical Analysis

Very simple web server with twot routes. In order to proccess large files for hashing, the hash is build on every data chunk.

Simple in memory database is used, data will be accessible while proccess is live.

# Shortcuts

## On a production like project I will do the following modifications:

* Separate on diferent modules the router, the logict inside the controllers (a special module for MD5 encoding only) and the in-memory database.
* Add testing.
* Handle possible errors on post request processing.
