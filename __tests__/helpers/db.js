const db = require('../../db/database');

function clearLeads() {
  db.exec('DELETE FROM leads');
}

module.exports = { clearLeads };
