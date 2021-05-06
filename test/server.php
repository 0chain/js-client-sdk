<?php

// Fix CORS.
// header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Credentials: true");
header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
header('Access-Control-Max-Age: 1000');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token , Authorization');

//router.php
$path = pathinfo($_SERVER["SCRIPT_FILENAME"]);
if ($path["extension"] == "wasm") {
  header("Content-Type: application/wasm");
  readfile($_SERVER["SCRIPT_FILENAME"]);
} else {
  return FALSE;
}
?>
