cmake_minimum_required(VERSION 3.18)
project(eliza LANGUAGES CXX CUDA)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# CUDA configuration
set(CMAKE_CUDA_STANDARD 14)
set(CMAKE_CUDA_ARCHITECTURES 61) # GTX 1080

# Find CUDA
find_package(CUDA 12.6 REQUIRED)
include_directories(${CUDA_INCLUDE_DIRS})

# Add node-llama-cpp specific options
option(LLAMA_CUBLAS "Enable cuBLAS" ON)
option(LLAMA_CUDA "Enable CUDA" ON)

# Set paths for node-llama-cpp build
set(NODE_LLAMA_CPP_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-llama-cpp")
set(LLAMA_CPP_SOURCE "${NODE_LLAMA_CPP_ROOT}/llama.cpp")

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/agent
    ${CMAKE_CURRENT_SOURCE_DIR}/packages
)

# Add compile definitions
add_definitions(-DGGML_USE_CUDA)
