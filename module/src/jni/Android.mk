LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

XDL_FILES := $(wildcard $(LOCAL_PATH)/xdl/*.c)

LOCAL_MODULE := zygiskfrida
LOCAL_C_INCLUDES := $(LOCAL_PATH)/xdl/include $(LOCAL_PATH)/include
LOCAL_SRC_FILES := inject.cpp config.cpp child_gating.cpp remapper.cpp main_zygisk.cpp $(XDL_FILES:$(LOCAL_PATH)/%=%)
LOCAL_STATIC_LIBRARIES := dobby
LOCAL_LDLIBS := -llog

include $(BUILD_SHARED_LIBRARY)

$(call import-module,prefab/dobby)
