package com.Datium.Datium.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DataInitializer {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Bean
    CommandLineRunner initDatabase() {
        return args -> {
            System.out.println("----- DATIUM: Initializing Database Data -----");
            
            // Ensure Plans exist with specific IDs. 
            // We use INSERT IGNORE to skip if ID exists.
            
            // Plan 1: Básico (1 System, 3 Tables)
            try {
                // Check if Plan 1 exists
                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM plans WHERE id = 1", Integer.class);
                if (count == 0) {
                     jdbcTemplate.update("INSERT INTO plans (id, name, max_systems, max_tables_per_system, max_records_per_system, max_users_per_system, max_fields_per_system) VALUES (1, 'Básico', 1, 3, 1000, 2, 20)");
                     System.out.println("Plan Básico created.");
                } else {
                     // Optionally update?
                     jdbcTemplate.update("UPDATE plans SET name='Básico', max_systems=1, max_tables_per_system=3 WHERE id=1");
                     System.out.println("Plan Básico updated.");
                }

                // Plan 2: Pro (10 Systems, 15 Tables)
                count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM plans WHERE id = 2", Integer.class);
                if (count == 0) {
                     jdbcTemplate.update("INSERT INTO plans (id, name, max_systems, max_tables_per_system, max_records_per_system, max_users_per_system, max_fields_per_system) VALUES (2, 'Pro', 10, 15, 10000, 10, 100)");
                     System.out.println("Plan Pro created.");
                } else {
                     jdbcTemplate.update("UPDATE plans SET name='Pro', max_systems=10, max_tables_per_system=15 WHERE id=2");
                     System.out.println("Plan Pro updated.");
                }

                // Plan 3: Empresarial (Unlimited)
                count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM plans WHERE id = 3", Integer.class);
                if (count == 0) {
                     jdbcTemplate.update("INSERT INTO plans (id, name, max_systems, max_tables_per_system, max_records_per_system, max_users_per_system, max_fields_per_system) VALUES (3, 'Empresarial', 99999999, 99999999, NULL, NULL, NULL)");
                     System.out.println("Plan Empresarial created.");
                } else {
                     jdbcTemplate.update("UPDATE plans SET name='Empresarial', max_systems=99999999, max_tables_per_system=99999999 WHERE id=3");
                     System.out.println("Plan Empresarial updated.");
                }

            } catch (Exception e) {
                System.err.println("Error seeding data: " + e.getMessage());
                e.printStackTrace();
            }
            
            System.out.println("----- DATIUM: Serialization Complete -----");
        };
    }
}
