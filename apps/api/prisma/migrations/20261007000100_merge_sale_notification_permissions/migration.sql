UPDATE roles
SET permissions = array_append(permissions, 'notifications.all_sales')
WHERE ('sales.supervise' = ANY(permissions) OR 'notifications.new_sales' = ANY(permissions))
  AND NOT ('notifications.all_sales' = ANY(permissions));

UPDATE roles
SET permissions = array_remove(array_remove(permissions, 'sales.supervise'), 'notifications.new_sales')
WHERE 'sales.supervise' = ANY(permissions) OR 'notifications.new_sales' = ANY(permissions);
