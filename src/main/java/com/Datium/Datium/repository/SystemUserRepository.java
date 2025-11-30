package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemUserRepository extends JpaRepository<SystemUser, Integer> {
    List<SystemUser> findBySystemId(Integer systemId);
    
    Optional<SystemUser> findBySystemIdAndUserId(Integer systemId, Integer userId);
    
    boolean existsBySystemIdAndUserId(Integer systemId, Integer userId);
    
    @Query("SELECT COUNT(DISTINCT su.userId) FROM SystemUser su WHERE su.systemId = :systemId")
    Long countDistinctUsersBySystemId(Integer systemId);
    
    @Query("SELECT COUNT(su) FROM SystemUser su WHERE su.systemId = :systemId")
    Long countBySystemId(Integer systemId);
    
    List<SystemUser> findByUserId(Integer userId);
}


