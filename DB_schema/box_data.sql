CREATE TABLE `box_data` (
	`ID` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`Box_ID` TEXT NOT NULL,
	`Time_received` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
	`Time_sent` DATETIME NULL DEFAULT NULL,
	`Dust1` FLOAT NULL DEFAULT NULL,
	`Dust2_5` FLOAT NULL DEFAULT NULL,
	`Dust10` FLOAT NULL DEFAULT NULL,
	`Presence` BIT(1) NULL DEFAULT NULL,
	`Temperature` FLOAT NULL DEFAULT NULL,
	`Humidity` FLOAT NULL DEFAULT NULL,
	`CO2` FLOAT NULL DEFAULT NULL,
	PRIMARY KEY (`ID`),
	INDEX `Box_ID` (`Box_ID`(6))
)
COLLATE='latin1_swedish_ci'
ENGINE=InnoDB
;
