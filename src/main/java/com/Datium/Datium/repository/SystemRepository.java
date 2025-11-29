package com.Datium.Datium.repository;

import com.Datium.Datium.entity.System;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemRepository extends JpaRepository<System, Integer> {
    List<System> findByOwnerId(Integer ownerId);
    
    @Query("SELECT COUNT(s) FROM System s WHERE s.ownerId = :ownerId")
    Long countByOwnerId(Integer ownerId);
    
    @Query("SELECT COUNT(s) FROM System s WHERE s.securityMode = :mode")
    Long countBySecurityMode(System.SecurityMode mode);
}


