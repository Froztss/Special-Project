CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('caregiver', 'ot', 'sped_teacher') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  delay_domain ENUM('speech', 'motor', 'cognitive', 'social', 'general') NOT NULL,
  notes TEXT NULL,
  avatar VARCHAR(32) NOT NULL DEFAULT '🙂',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_children_user_id (user_id),
  CONSTRAINT fk_children_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(32) NOT NULL,
  category ENUM('hygiene', 'food', 'school', 'play', 'other') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_activities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NOT NULL,
  schedule_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedules_child_date (child_id, schedule_date),
  CONSTRAINT fk_schedules_child
    FOREIGN KEY (child_id) REFERENCES children (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id BIGINT UNSIGNED NOT NULL,
  activity_id BIGINT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(32) NOT NULL,
  start_time TIME NULL,
  duration_min SMALLINT UNSIGNED NULL,
  position SMALLINT UNSIGNED NOT NULL,
  status ENUM('pending', 'done') NOT NULL DEFAULT 'pending',
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tasks_schedule_position (schedule_id, position),
  KEY idx_tasks_activity_id (activity_id),
  CONSTRAINT fk_tasks_schedule
    FOREIGN KEY (schedule_id) REFERENCES schedules (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_tasks_activity
    FOREIGN KEY (activity_id) REFERENCES activities (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS picture_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NULL,
  category ENUM('Food', 'Emotions', 'Activities', 'Needs') NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_picture_cards_child_category (child_id, category),
  CONSTRAINT fk_picture_cards_child
    FOREIGN KEY (child_id) REFERENCES children (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  user_id BIGINT UNSIGNED NOT NULL,
  font_size ENUM('small', 'medium', 'large') NOT NULL DEFAULT 'medium',
  contrast ENUM('normal', 'high') NOT NULL DEFAULT 'normal',
  sound_on BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
