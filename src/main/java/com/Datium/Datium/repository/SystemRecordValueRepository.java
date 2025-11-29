package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemRecordValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemRecordValueRepository extends JpaRepository<SystemRecordValue, Integer> {
    List<SystemRecordValue> findByRecordId(Integer recordId);
    
    Optional<SystemRecordValue> findByRecordIdAndFieldId(Integer recordId, Integer fieldId);
    
    void deleteByRecordId(Integer recordId);
}


