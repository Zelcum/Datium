package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemRecordValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemRecordValueRepository extends JpaRepository<SystemRecordValue, Integer> {
    List<SystemRecordValue> findByRecordId(Integer recordId);
    
    Optional<SystemRecordValue> findByRecordIdAndFieldId(Integer recordId, Integer fieldId);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM SystemRecordValue rv WHERE rv.recordId = :recordId")
    void deleteByRecordId(@Param("recordId") Integer recordId);
    
    @Query("SELECT DISTINCT rv.recordId FROM SystemRecordValue rv WHERE rv.fieldId = :fieldId")
    List<Integer> findDistinctRecordIdsByFieldId(@Param("fieldId") Integer fieldId);
    
    List<SystemRecordValue> findByFieldId(Integer fieldId);
}


