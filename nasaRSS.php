<?php
$url = $_POST['feedUrl'];
$x=file_get_contents($url);
echo $x;
 ?>