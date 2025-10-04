const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

(async () => {
    const pool = await mysql.createPool({
        host: "localhost",
        user: "root",
        password: "", 
        database: "mubas_assessment_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const defaultPasswords = {
        "LEC00": "@mtembo",     
        "LEC000": "@mhango",
        "LEC01": "@mchinguo",
        "LEC010": "@msendema",
        "LEC012": "@gfrancis",
        "LEC013": "@minusa",
        "LEC014": "@fhussein",
        "LEC016": "@tnsiku",
        "LEC02": "@hchilunga",
        "LEC020": "@tkalua",
        "LEC021": "@kvitumbiko",
        "LEC022": "@mkalua",
        "LEC026": "@kombi",
        "LEC027": "@vitukombi",
        "LEC03": "@ekamwendo",
        "LEC030": "@kthkkn",
        "LEC032": "@mclement",
        "LEC034": "@abishayi",
        "LEC04": "@gnyirenda",
        "LEC05": "@ataylor",
        "LEC06": "@abanda",
        "LEC07": "@dmkavea",
        "LEC08": "@mnkonjo",
        "LEC089": "@mkoyin",
        "LEC09": "@dmunthali"
    };

    for (const [lecturerId, plainPassword] of Object.entries(defaultPasswords)) {
        const hashed = await bcrypt.hash(plainPassword, 10);
        await pool.query(
            "UPDATE lecturer SET password = ? WHERE lecturer_id = ?",
            [hashed, lecturerId]
        );
        console.log(`Updated ${lecturerId} with password ${plainPassword}`);
    }

    console.log("✅ All lecturer passwords updated with bcrypt hashes");
    process.exit();
})();
