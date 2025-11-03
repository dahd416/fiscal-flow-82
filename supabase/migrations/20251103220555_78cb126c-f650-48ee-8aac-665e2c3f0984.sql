-- Delete any existing roles for the user quantisolutions2@gmail.com
DELETE FROM user_roles 
WHERE user_id = 'fb65ad47-5771-4271-9082-bf5b1604b175';

-- Assign the super_admin role
INSERT INTO user_roles (user_id, role)
VALUES ('fb65ad47-5771-4271-9082-bf5b1604b175', 'super_admin');