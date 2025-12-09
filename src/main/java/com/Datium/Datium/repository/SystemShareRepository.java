package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemShare;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SystemShareRepository extends JpaRepository<SystemShare, Integer> {
    List<SystemShare> findBySystemId(Integer systemId);
    List<SystemShare> findByUserEmail(String userEmail);
    Optional<SystemShare> findBySystemIdAndUserEmail(Integer systemId, String userEmail);
    void deleteBySystemId(Integer systemId);
}
