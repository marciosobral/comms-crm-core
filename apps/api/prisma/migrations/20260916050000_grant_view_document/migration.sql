UPDATE roles
SET permissions = array_append(permissions, 'customers.view_document')
WHERE 'customers.view' = ANY(permissions)
  AND NOT ('customers.view_document' = ANY(permissions));
