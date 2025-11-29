package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemUserPassword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemUserPasswordRepository extends JpaRepository<SystemUserPassword, Integer> {
    Optional<SystemUserPassword> findBySystemIdAndUserId(Integer systemId, Integer userId);
    
    boolean existsBySystemIdAndUserId(Integer systemId, Integer userId);
}


