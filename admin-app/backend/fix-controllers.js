const fs = require('fs');
const path = require('path');

// Read the database schema to get correct field names
const schemaPath = path.join(__dirname, '../../server/database-schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Extract table definitions
const tableDefinitions = {};
const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\);/g;
let match;
while ((match = tableRegex.exec(schemaContent)) !== null) {
  tableDefinitions[match[1]] = match[2];
}

// Helper function to get field names from table definition
function getFields(tableName) {
  const definition = tableDefinitions[tableName];
  if (!definition) return [];
  
  // Extract field names (everything before the first parenthesis)
  const fields = definition.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('--') && !line.startsWith('CREATE') && !line.startsWith('INDEX'))
    .map(line => {
      // Remove type definitions and constraints
      const parts = line.split(/\s+/);
      return parts[0];
    })
    .filter(field => field);
  
  return fields;
}

// Get correct field names for each table
const fieldMap = {
  testimonial: getFields('testimonial'),
  team: getFields('team'),
  team_members: getFields('team_members'),
  highlight: getFields('highlight'),
  gallery: getFields('gallery'),
  resource: getFields('resource'),
  blog: getFields('blog')
};

console.log('Field mappings:');
Object.entries(fieldMap).forEach(([table, fields]) => {
  console.log(`${table}:`, fields.join(', '));
});