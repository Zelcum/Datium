package com.Datium.Datium.repository;

import com.Datium.Datium.entity.SystemTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemTableRepository extends JpaRepository<SystemTable, Integer> {
    List<SystemTable> findBySystemIdOrderByCreatedAtAsc(Integer systemId);

    Optional<SystemTable> findByIdAndSystemId(Integer id, Integer systemId);

    Long countBySystemId(Integer systemId);
}
