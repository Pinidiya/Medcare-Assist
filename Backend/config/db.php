<?php

/*මේකෙදි Database එකට connect වෙන්න PDO (PHP Data Objects) 
 මේ හරහා හැම query එකක්ම 
Prepared Statements විදියට run */


require_once __DIR__ . '/Database.php';

$pdo = Database::getInstance()->getConnection();
