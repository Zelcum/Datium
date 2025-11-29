package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemFieldOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemFieldOptionRepository extends JpaRepository<SystemFieldOption, Integer> {
    List<SystemFieldOption> findByFieldId(Integer fieldId);
    
    void deleteByFieldId(Integer fieldId);
}


