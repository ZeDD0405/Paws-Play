<?php
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Getting form data
    $username = $_POST['Username'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirmPassword = $_POST['Confirm'];
    $lightbill = $_FILES['lightbill']['name']; 
    $aadhar = $_FILES['aadhar']['name']; 
    $role = $_POST['role']; 

    
    if ($password !== $confirmPassword) {
        echo "Passwords do not match.";
        exit;
    }

    
    $targetDir = "uploads/";
    $lightbillPath = $targetDir . basename($lightbill);
    $aadharPath = $targetDir . basename($aadhar);
    
    move_uploaded_file($_FILES['lightbill']['tmp_name'], $lightbillPath);
    move_uploaded_file($_FILES['aadhar']['tmp_name'], $aadharPath);

    
    $conn = new mysqli('localhost', 'root', '', 'test');
    if ($conn->connect_error) {
        die("Connection Failed: " . $conn->connect_error);
    } else {
        
        $stmt = $conn->prepare("INSERT INTO registration (username, email, password, role, lightbill, aadhar) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $username, $email, $password, $role, $lightbillPath, $aadharPath);
        $execval = $stmt->execute();
        
        if ($execval) {
            echo "Registration successful.";
        } else {
            echo "Registration failed.";
        }

        $stmt->close();
        $conn->close();
    }
}
?>
